export type Sentiment = 'positive' | 'neutral' | 'negative'

export type MarketStatus = 'open' | 'closed' | 'pre' | 'post'

export type TrendDirection = 'up' | 'down' | 'flat'

export interface Stock {
  symbol: string
  name: string
  sector: string
  industry: string
  price: number
  previousClose: number
  change: number
  changePercent: number
  marketCap: number
  peRatio: number
  eps: number
  dividendYield: number
  high52: number
  low52: number
  volume: number
  avgVolume: number
  description: string
  accent: string
}

export interface MarketIndex {
  symbol: string
  name: string
  value: number
  change: number
  changePercent: number
}

export type ChartRange = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '5Y'

export type ChartType = 'area' | 'line'

export interface HistoricalPoint {
  timestamp: number
  label: string
  value: number
}

export type NewsCategory =
  | 'Markets'
  | 'Earnings'
  | 'Technology'
  | 'Energy'
  | 'Economy'
  | 'Company'

/** Feed selection supported by `GET /api/news/market?category=…`. */
export type MarketNewsCategory = 'general' | 'forex' | 'crypto' | 'merger'

/**
 * A normalized article as returned by the API. Mirrors the server's
 * `NewsArticleDto`: missing values are `null` rather than invented text.
 */
export interface NewsArticle {
  id: string
  headline: string
  summary: string | null
  source: string
  url: string | null
  /** ISO-8601 timestamp. */
  publishedAt: string
  tickers: string[]
  /** Provider category label (e.g. "general", "company news"). */
  category: string
  thumbnail: string | null
  sentiment: Sentiment
  /** Lexicon score in [-1, 1]; not a price prediction. */
  sentimentScore: number
}

export interface SentimentSummary {
  label: Sentiment | 'insufficient'
  score: number | null
  positive: number
  neutral: number
  negative: number
  articleCount: number
}

export interface NewsFeed {
  scope: 'company' | 'market'
  symbol: string | null
  category: string | null
  page: number
  pageSize: number
  total: number
  hasMore: boolean
  articles: NewsArticle[]
  sentiment: SentimentSummary
}

export type AlertCondition =
  | 'price_above'
  | 'price_below'
  | 'percent_increase'
  | 'percent_decrease'

export type AlertStatus = 'active' | 'triggered' | 'disabled'

export interface PriceAlert {
  id: string
  symbol: string
  name: string | null
  condition: AlertCondition
  threshold: number
  enabled: boolean
  status: AlertStatus
  triggeredAt: string | null
  lastCheckedAt: string | null
  lastPrice: number | null
  /** Reference price for percentage conditions (session open); null otherwise. */
  baselinePrice: number | null
  createdAt: string
  updatedAt: string
}

export type ActivityStatus = 'success' | 'pending' | 'failed'

export interface AdminActivity {
  id: string
  user: string
  action: string
  target: string
  timestamp: string
  status: ActivityStatus
}

export interface UserProfile {
  name: string
  email: string
  initials: string
  role: string
  plan: string
}

export interface Notification {
  id: string
  title: string
  description: string
  time: string
  read: boolean
  tone: Sentiment
}
