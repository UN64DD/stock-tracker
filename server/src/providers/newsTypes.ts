import type { MarketNewsCategory } from '../lib/validate.js'

/**
 * A provider-independent article shape. Providers map their own response into
 * this form so the news service and routes never touch provider-specific
 * fields. Timestamps are Unix milliseconds; missing values are `null`, never
 * fabricated.
 */
export interface NormalizedNewsArticle {
  /** Stable provider identifier. */
  id: string
  headline: string
  summary: string | null
  source: string
  url: string | null
  /** Unix milliseconds. */
  publishedAt: number
  /** Related ticker symbols (may be empty). */
  tickers: string[]
  /** Thumbnail image URL, only when the provider supplies one. */
  thumbnail: string | null
  /** Provider category label (e.g. "general", "technology"). */
  category: string
  language: string | null
}

/**
 * Source of company and market news, separate from the price `StockProvider`
 * because the project uses a dedicated news vendor (Twelve Data has no general
 * news endpoint).
 */
export interface NewsProvider {
  readonly name: string
  readonly configured: boolean
  readonly note: string
  getCompanyNews(
    symbol: string,
    from: number,
    to: number,
    signal?: AbortSignal,
  ): Promise<NormalizedNewsArticle[]>
  getMarketNews(
    category: MarketNewsCategory,
    signal?: AbortSignal,
  ): Promise<NormalizedNewsArticle[]>
}
