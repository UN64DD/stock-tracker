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

export type ChartRange = '1D' | '1W' | '1M' | '3M' | '1Y'

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

export interface NewsArticle {
  id: string
  headline: string
  source: string
  publishedAt: string
  ticker?: string
  company?: string
  sentiment: Sentiment
  category: NewsCategory
  summary: string
  hasExternalLink: boolean
}

export type AlertCondition =
  | 'price_above'
  | 'price_below'
  | 'percent_increase'
  | 'percent_decrease'

export interface PriceAlert {
  id: string
  symbol: string
  condition: AlertCondition
  target: number
  enabled: boolean
  createdAt: string
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
