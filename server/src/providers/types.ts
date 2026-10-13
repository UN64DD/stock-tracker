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
}
