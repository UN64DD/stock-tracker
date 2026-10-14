import { TTLCache } from '../lib/cache.js'
import type { ProviderBudget } from '../lib/budget.js'
import {
  NotFoundError,
  ProviderError,
  ProviderPlanRestrictedError,
  ProviderRateLimitError,
  UpstreamTimeoutError,
} from '../lib/errors.js'
import type { CacheTtlConfig } from '../config.js'
import type { ChartRange } from '../lib/validate.js'
import type {
  CompanyFinancials,
  CompanyProfile,
  HistoricalSeries,
  ReportedFundamentals,
  StockProvider,
  StockQuote,
  StockSearchResult,
} from '../providers/types.js'

export interface CacheResult<T> {
  data: T
  cached: boolean
  stale: boolean
  fetchedAt: number
}

export interface ProviderInfo {
  name: string
  configured: boolean
  dataStatus: string
  dataStatusNote: string
}

const PROFILE_RESTRICTION_TTL_MS = 6 * 60 * 60 * 1000

const STATISTICS_LIMITATION =
  "Reported fundamentals (market cap, P/E, EPS, dividend yield, revenue) require Twelve Data's Pro plan or higher. Live market metrics are shown instead."

function isTransient(error: unknown): boolean {
  if (error instanceof ProviderRateLimitError) return true
  if (error instanceof UpstreamTimeoutError) return true
  if (error instanceof ProviderError) return (error.status ?? 502) >= 500
  return false
}

/**
 * Provider-agnostic market data facade. Adds TTL caching, stale-on-error
 * fallback, and free-tier budget awareness on top of a StockProvider.
 */
export class MarketDataService {
  private profileRestrictedUntil = 0
  private statisticsRestrictedUntil = 0

  constructor(
    private readonly provider: StockProvider,
    private readonly cache: TTLCache,
    private readonly ttl: CacheTtlConfig,
    private readonly budget: ProviderBudget,
  ) {}

  getProviderInfo(): ProviderInfo {
    return {
      name: this.provider.name,
      configured: this.provider.configured,
      dataStatus: this.provider.dataStatus,
      dataStatusNote: this.provider.dataStatusNote,
    }
  }

  private async withCache<T>(
    key: string,
    ttlMs: number,
    cost: number,
    fetcher: (signal?: AbortSignal) => Promise<T>,
    signal?: AbortSignal,
  ): Promise<CacheResult<T>> {
    const hit = this.cache.get<T>(key)
    if (hit?.fresh) {
      return { data: hit.value, cached: true, stale: false, fetchedAt: hit.storedAt }
    }

    try {
      this.budget.consume(cost)
      const value = await fetcher(signal)
      this.cache.set(key, value, ttlMs)
      return { data: value, cached: false, stale: false, fetchedAt: Date.now() }
    } catch (error) {
      if (hit && isTransient(error)) {
        return { data: hit.value, cached: true, stale: true, fetchedAt: hit.storedAt }
      }
      throw error
    }
  }

  search(query: string, limit: number, signal?: AbortSignal): Promise<CacheResult<StockSearchResult[]>> {
    const key = `search:${query.toLowerCase()}:${limit}`
    return this.withCache(
      key,
      this.ttl.search,
      1,
      (innerSignal) => this.provider.searchStocks(query, limit, innerSignal),
      signal,
    )
  }

  quote(symbol: string, signal?: AbortSignal): Promise<CacheResult<StockQuote | null>> {
    return this.withCache(
      `quote:${symbol}`,
      this.ttl.quote,
      1,
      (innerSignal) => this.provider.getQuote(symbol, innerSignal),
      signal,
    )
  }

  async quotes(
    symbols: string[],
    signal?: AbortSignal,
  ): Promise<CacheResult<Map<string, StockQuote>>> {
    const result = new Map<string, StockQuote>()
    const missing: string[] = []
    let fetchedAt = Date.now()
    let cached = true
    let stale = false

    for (const symbol of symbols) {
      const hit = this.cache.get<StockQuote | null>(`quote:${symbol}`)
      if (hit?.fresh && hit.value) {
        result.set(symbol, hit.value)
        fetchedAt = Math.min(fetchedAt, hit.storedAt)
      } else {
        missing.push(symbol)
        cached = false
      }
    }

    if (missing.length === 0) {
      return { data: result, cached: true, stale: false, fetchedAt }
    }

    try {
      this.budget.consume(missing.length)
      const fetched = await this.provider.getQuotes(missing, signal)
      const now = Date.now()
      for (const [symbol, quote] of fetched) {
        this.cache.set(`quote:${symbol}`, quote, this.ttl.quote)
        result.set(symbol, quote)
      }
      fetchedAt = Math.min(fetchedAt, now)
      return { data: result, cached, stale: false, fetchedAt }
    } catch (error) {
      if (!isTransient(error)) throw error
      for (const symbol of missing) {
        const hit = this.cache.get<StockQuote | null>(`quote:${symbol}`)
        if (hit?.value) {
          result.set(symbol, hit.value)
          stale = true
          fetchedAt = Math.min(fetchedAt, hit.storedAt)
        }
      }
      if (result.size === 0) throw error
      return { data: result, cached: true, stale, fetchedAt }
    }
  }

  history(
    symbol: string,
    range: ChartRange,
    signal?: AbortSignal,
  ): Promise<CacheResult<HistoricalSeries | null>> {
    return this.withCache(
      `history:${symbol}:${range}`,
      this.ttl.history,
      1,
      (innerSignal) => this.provider.getHistoricalPrices(symbol, range, innerSignal),
      signal,
    )
  }

  profile(symbol: string, signal?: AbortSignal): Promise<CacheResult<CompanyProfile | null>> {
    return this.withCache(
      `profile:${symbol}`,
      this.ttl.profile,
      1,
      (innerSignal) => this.fetchProfile(symbol, innerSignal),
      signal,
    )
  }

  financials(
    symbol: string,
    signal?: AbortSignal,
  ): Promise<CacheResult<CompanyFinancials>> {
    return this.withCache(
      `financials:${symbol}`,
      this.ttl.financials,
      1,
      (innerSignal) => this.buildFinancials(symbol, innerSignal),
      signal,
    )
  }

  private async buildFinancials(
    symbol: string,
    signal?: AbortSignal,
  ): Promise<CompanyFinancials> {
    // Live market metrics come from the (cached) quote; reported fundamentals
    // come from the statistics endpoint, which may be plan-restricted.
    const quoteResult = await this.quote(symbol, signal)
    const quote = quoteResult.data
    if (!quote) {
      throw new NotFoundError(`No financial data is available for "${symbol}".`)
    }

    const reported = await this.fetchStatistics(symbol, signal)
    const limited = reported === null

    return {
      symbol,
      name: quote.name,
      currency: quote.currency ?? reported?.currency ?? null,
      exchange: quote.exchange ?? reported?.exchange ?? null,
      high52Week: quote.high52Week,
      low52Week: quote.low52Week,
      averageVolume: quote.averageVolume,
      marketCap: reported?.marketCap ?? null,
      trailingPe: reported?.trailingPe ?? null,
      eps: reported?.eps ?? null,
      dividendYieldPercent: reported?.dividendYieldPercent ?? null,
      revenue: reported?.revenue ?? null,
      revenuePeriod: reported?.revenuePeriod ?? null,
      dataStatus: quote.dataStatus,
      limited,
      limitationReason: limited ? STATISTICS_LIMITATION : null,
    }
  }

  private async fetchStatistics(
    symbol: string,
    signal?: AbortSignal,
  ): Promise<ReportedFundamentals | null> {
    if (Date.now() < this.statisticsRestrictedUntil) return null

    try {
      return await this.provider.getStatistics(symbol, signal)
    } catch (error) {
      if (error instanceof ProviderPlanRestrictedError) {
        this.statisticsRestrictedUntil = Date.now() + PROFILE_RESTRICTION_TTL_MS
        return null
      }
      throw error
    }
  }

  private async fetchProfile(
    symbol: string,
    signal?: AbortSignal,
  ): Promise<CompanyProfile | null> {
    if (Date.now() < this.profileRestrictedUntil) {
      return this.buildPartialProfile(symbol, signal)
    }

    try {
      return await this.provider.getCompanyProfile(symbol, signal)
    } catch (error) {
      if (error instanceof ProviderPlanRestrictedError) {
        this.profileRestrictedUntil = Date.now() + PROFILE_RESTRICTION_TTL_MS
        return this.buildPartialProfile(symbol, signal)
      }
      throw error
    }
  }

  private async buildPartialProfile(
    symbol: string,
    signal?: AbortSignal,
  ): Promise<CompanyProfile> {
    let name: string | null = null
    let exchange: string | null = null
    let currency: string | null = null

    try {
      const quote = await this.quote(symbol, signal)
      name = quote.data?.name ?? null
      exchange = quote.data?.exchange ?? null
      currency = quote.data?.currency ?? null
    } catch (error) {
      if (error instanceof NotFoundError) throw error
    }

    return {
      symbol,
      name,
      exchange,
      currency,
      sector: null,
      industry: null,
      website: null,
      description: null,
      marketCap: null,
      employees: null,
      country: null,
      ceo: null,
      limited: true,
      limitationReason:
        "Company fundamentals require Twelve Data's Grow plan or higher. Showing available quote metadata only.",
    }
  }
}
