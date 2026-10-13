import { fetchJson } from '../lib/http.js'
import {
  ConfigurationError,
  NotFoundError,
  ProviderAuthError,
  ProviderError,
  ProviderPlanRestrictedError,
  ProviderRateLimitError,
} from '../lib/errors.js'
import type { ChartRange } from '../lib/validate.js'
import type {
  CompanyProfile,
  DataStatus,
  HistoricalPoint,
  HistoricalSeries,
  StockProvider,
  StockQuote,
  StockSearchResult,
} from './types.js'

const BASE_URL = 'https://api.twelvedata.com'

interface RangeConfig {
  interval: string
  outputsize: number
  intraday: boolean
  dataStatus: DataStatus
}

const RANGE_CONFIG: Record<ChartRange, RangeConfig> = {
  '1D': { interval: '5min', outputsize: 78, intraday: true, dataStatus: 'real-time' },
  '1W': { interval: '1h', outputsize: 40, intraday: true, dataStatus: 'real-time' },
  '1M': { interval: '1day', outputsize: 30, intraday: false, dataStatus: 'end-of-day' },
  '3M': { interval: '1day', outputsize: 92, intraday: false, dataStatus: 'end-of-day' },
  '1Y': { interval: '1week', outputsize: 52, intraday: false, dataStatus: 'end-of-day' },
}

type RawRecord = Record<string, unknown>

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function toTimestampSeconds(value: unknown): number | null {
  const seconds = toNumber(value)
  return seconds === null ? null : seconds * 1000
}

function toText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function isRecord(value: unknown): value is RawRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export class TwelveDataProvider implements StockProvider {
  readonly name = 'twelvedata'
  readonly configured: boolean
  readonly dataStatusNote =
    'Real-time US equity prices on the Twelve Data free plan during market hours; the latest available close is shown when the market is closed.'

  private readonly apiKey: string | undefined
  private readonly timeoutMs: number

  constructor(apiKey: string | undefined, timeoutMs: number) {
    this.apiKey = apiKey
    this.configured = Boolean(apiKey)
    this.timeoutMs = timeoutMs
  }

  get dataStatus(): DataStatus {
    return 'real-time'
  }

  private ensureConfigured(): string {
    if (!this.apiKey) {
      throw new ConfigurationError(
        'STOCK_API_KEY is not set. Add a Twelve Data API key to server/.env.',
      )
    }
    return this.apiKey
  }

  private async request<T>(path: string, params: Record<string, string>, signal?: AbortSignal): Promise<T> {
    const apiKey = this.ensureConfigured()
    const search = new URLSearchParams(params)
    const url = `${BASE_URL}/${path}?${search.toString()}`

    const { ok, status, data } = await fetchJson<T>(url, {
      timeoutMs: this.timeoutMs,
      headers: { Authorization: `apikey ${apiKey}` },
      signal,
    })

    this.throwForTransportStatus(status)
    if (!ok) {
      throw new ProviderError('The market data provider rejected the request.', { status: 502 })
    }
    return data
  }

  private throwForTransportStatus(status: number): void {
    if (status === 401) throw new ProviderAuthError()
    if (status === 429) throw new ProviderRateLimitError()
    if (status === 403) throw new ProviderPlanRestrictedError()
  }

  private throwIfProviderError(data: unknown): void {
    if (!isRecord(data)) return
    if (data.status !== 'error' && !('code' in data && 'message' in data && !('symbol' in data))) {
      return
    }
    const code = Number(data.code)
    const message = typeof data.message === 'string' ? data.message : 'Provider error.'
    if (code === 401) throw new ProviderAuthError()
    if (code === 429) throw new ProviderRateLimitError()
    if (code === 403) throw new ProviderPlanRestrictedError(message)
    if (code === 404) throw new NotFoundError(message)
    throw new ProviderError(message, { status: 502, details: { providerCode: code } })
  }

  async searchStocks(query: string, limit: number, signal?: AbortSignal): Promise<StockSearchResult[]> {
    const data = await this.request<RawRecord>('symbol_search', {
      symbol: query,
      outputsize: String(Math.min(Math.max(limit, 1), 120)),
    }, signal)
    this.throwIfProviderError(data)

    const rows = Array.isArray(data.data) ? data.data : []
    return rows
      .filter(isRecord)
      .map((row) => ({
        symbol: String(row.symbol ?? '').toUpperCase(),
        name: toText(row.instrument_name) ?? String(row.symbol ?? ''),
        exchange: toText(row.exchange),
        currency: toText(row.currency),
        instrumentType: toText(row.instrument_type),
        country: toText(row.country),
      }))
      .filter((row) => row.symbol.length > 0)
  }

  async getQuote(symbol: string, signal?: AbortSignal): Promise<StockQuote | null> {
    const data = await this.request<RawRecord>('quote', { symbol }, signal)
    this.throwIfProviderError(data)
    return this.parseQuote(symbol, data)
  }

  async getQuotes(symbols: string[], signal?: AbortSignal): Promise<Map<string, StockQuote>> {
    const result = new Map<string, StockQuote>()
    if (symbols.length === 0) return result

    const data = await this.request<RawRecord>('quote', { symbol: symbols.join(',') }, signal)
    this.throwIfProviderError(data)

    // A single-symbol request is returned as a flat quote object rather than a
    // map keyed by symbol.
    if ('symbol' in data && typeof data.symbol === 'string') {
      const quote = this.parseQuote(String(data.symbol).toUpperCase(), data)
      if (quote) result.set(quote.symbol, quote)
      return result
    }

    for (const [key, value] of Object.entries(data)) {
      if (!isRecord(value)) continue
      if (value.status === 'error') continue
      const quote = this.parseQuote(key.toUpperCase(), value)
      if (quote) result.set(quote.symbol, quote)
    }
    return result
  }

  private parseQuote(symbol: string, raw: RawRecord): StockQuote | null {
    const price = toNumber(raw.close) ?? toNumber(raw.price)
    if (price === null) return null

    const isMarketOpen = typeof raw.is_market_open === 'boolean' ? raw.is_market_open : null
    const fiftyTwo = isRecord(raw.fifty_two_week) ? raw.fifty_two_week : {}

    return {
      symbol,
      name: toText(raw.name),
      exchange: toText(raw.exchange),
      currency: toText(raw.currency),
      price,
      change: toNumber(raw.change),
      changePercent: toNumber(raw.percent_change),
      previousClose: toNumber(raw.previous_close),
      open: toNumber(raw.open),
      high: toNumber(raw.high),
      low: toNumber(raw.low),
      volume: toNumber(raw.volume),
      averageVolume: toNumber(raw.average_volume),
      high52Week: toNumber(fiftyTwo.high),
      low52Week: toNumber(fiftyTwo.low),
      isMarketOpen,
      timestamp: toTimestampSeconds(raw.last_quote_at) ?? toTimestampSeconds(raw.timestamp),
      dataStatus: isMarketOpen === true ? 'real-time' : 'end-of-day',
    }
  }

  async getHistoricalPrices(
    symbol: string,
    range: ChartRange,
    signal?: AbortSignal,
  ): Promise<HistoricalSeries | null> {
    const config = RANGE_CONFIG[range]
    const data = await this.request<RawRecord>('time_series', {
      symbol,
      interval: config.interval,
      outputsize: String(config.outputsize),
      order: 'asc',
      adjust: 'splits',
    }, signal)
    this.throwIfProviderError(data)

    const rawValues = Array.isArray(data.values) ? data.values : []
    if (rawValues.length === 0) return null

    const meta = isRecord(data.meta) ? data.meta : {}
    const points = rawValues
      .filter(isRecord)
      .map((row) => this.parseHistoryPoint(row, config.intraday))
      .filter((point): point is HistoricalPoint => point !== null)

    if (points.length === 0) return null

    return {
      symbol,
      range,
      interval: config.interval,
      currency: toText(meta.currency),
      exchange: toText(meta.exchange),
      dataStatus: config.dataStatus,
      points,
    }
  }

  private parseHistoryPoint(row: RawRecord, intraday: boolean): HistoricalPoint | null {
    const datetime = toText(row.datetime)
    const value = toNumber(row.close)
    if (!datetime || value === null) return null

    const [datePart, timePart] = datetime.split(' ')
    const isoish = `${datePart}T${timePart ?? '00:00:00'}Z`
    const timestamp = Date.parse(isoish)

    return {
      timestamp: Number.isFinite(timestamp) ? timestamp : Date.now(),
      label: intraday ? (timePart ?? datePart).slice(0, 5) : formatDayLabel(datePart),
      value,
    }
  }

  async getCompanyProfile(symbol: string, signal?: AbortSignal): Promise<CompanyProfile | null> {
    const data = await this.request<RawRecord>('profile', { symbol }, signal)
    this.throwIfProviderError(data)
    if (!isRecord(data) || !data.symbol) return null

    return {
      symbol: String(data.symbol).toUpperCase(),
      name: toText(data.name),
      exchange: toText(data.exchange),
      currency: null,
      sector: toText(data.sector),
      industry: toText(data.industry),
      website: toText(data.website),
      description: toText(data.description),
      marketCap: toNumber(data.market_capitalization),
      employees: toNumber(data.employees),
      country: toText(data.country),
      ceo: toText(data.CEO),
      limited: false,
      limitationReason: null,
    }
  }
}

function formatDayLabel(datePart: string): string {
  const parsed = new Date(`${datePart}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return datePart
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(parsed)
}
