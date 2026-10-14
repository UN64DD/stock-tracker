import type { ChartRange } from '../lib/validate.js'

export type DataStatus = 'real-time' | 'delayed' | 'end-of-day' | 'unknown'

export interface StockSearchResult {
  symbol: string
  name: string
  exchange: string | null
  currency: string | null
  instrumentType: string | null
  country: string | null
}

export interface StockQuote {
  symbol: string
  name: string | null
  exchange: string | null
  currency: string | null
  price: number
  change: number | null
  changePercent: number | null
  previousClose: number | null
  open: number | null
  high: number | null
  low: number | null
  volume: number | null
  averageVolume: number | null
  high52Week: number | null
  low52Week: number | null
  isMarketOpen: boolean | null
  /** Unix milliseconds of the latest available quote. */
  timestamp: number | null
  dataStatus: DataStatus
}

export interface HistoricalPoint {
  timestamp: number
  label: string
  value: number
}

export interface HistoricalSeries {
  symbol: string
  range: ChartRange
  interval: string
  currency: string | null
  exchange: string | null
  dataStatus: DataStatus
  points: HistoricalPoint[]
}

/**
 * Reported company fundamentals sourced from the provider's statistics
 * endpoint. Every field is optional because provider plans expose different
 * subsets; `null` always means "not available", never zero.
 */
export interface ReportedFundamentals {
  symbol: string
  currency: string | null
  exchange: string | null
  /** Market value of outstanding shares, in `currency`. */
  marketCap: number | null
  /** Trailing price-to-earnings ratio. */
  trailingPe: number | null
  /** Diluted trailing-twelve-month earnings per share. */
  eps: number | null
  /** Trailing annual dividend yield, normalized to a percentage (e.g. 0.57 = 0.57%). */
  dividendYieldPercent: number | null
  /** Most recently reported revenue, in `currency`. */
  revenue: number | null
  /** Human-readable period the revenue figure covers (e.g. "TTM"). */
  revenuePeriod: string | null
}

export interface CompanyProfile {
  symbol: string
  name: string | null
  exchange: string | null
  currency: string | null
  sector: string | null
  industry: string | null
  website: string | null
  description: string | null
  marketCap: number | null
  employees: number | null
  country: string | null
  ceo: string | null
  /**
   * True when the provider plan does not expose full fundamentals, so only a
   * subset of fields (derived from quote metadata) could be populated.
   */
  limited: boolean
  limitationReason: string | null
}

/**
 * Financial overview for the stock details page. Mixes live market data
 * (52-week range, average volume) with figures the company reported for a
 * historical period (market cap, P/E, EPS, dividend yield, revenue). The
 * `limited` flag marks the case where the provider plan withholds reported
 * fundamentals, so the UI can explain the gap instead of showing zeroes.
 */
export interface CompanyFinancials {
  symbol: string
  name: string | null
  currency: string | null
  exchange: string | null
  /** Current market data. */
  high52Week: number | null
  low52Week: number | null
  averageVolume: number | null
  /** Reported fundamentals (historical period). */
  marketCap: number | null
  trailingPe: number | null
  eps: number | null
  dividendYieldPercent: number | null
  revenue: number | null
  revenuePeriod: string | null
  dataStatus: DataStatus
  limited: boolean
  limitationReason: string | null
}

export interface StockProvider {
  readonly name: string
  readonly configured: boolean
  readonly dataStatus: DataStatus
  readonly dataStatusNote: string
  searchStocks(query: string, limit: number, signal?: AbortSignal): Promise<StockSearchResult[]>
  getQuote(symbol: string, signal?: AbortSignal): Promise<StockQuote | null>
  getQuotes(symbols: string[], signal?: AbortSignal): Promise<Map<string, StockQuote>>
  getHistoricalPrices(
    symbol: string,
    range: ChartRange,
    signal?: AbortSignal,
  ): Promise<HistoricalSeries | null>
  getCompanyProfile(symbol: string, signal?: AbortSignal): Promise<CompanyProfile | null>
  /**
   * Reported fundamentals such as market cap, P/E, EPS and dividend yield.
   * Providers may throw a plan-restricted error when the endpoint is not
   * included in the configured plan; callers degrade gracefully.
   */
  getStatistics(symbol: string, signal?: AbortSignal): Promise<ReportedFundamentals | null>
}
