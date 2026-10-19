import type { Express } from 'express'
import { createApp } from '../app.js'
import type { AppConfig } from '../config.js'
import { openDatabase, type DatabaseConnection } from '../db/database.js'
import { ProviderBudget } from '../lib/budget.js'
import { TTLCache } from '../lib/cache.js'
import type { ChartRange } from '../lib/validate.js'
import { MarketDataService } from '../services/marketDataService.js'
import { NewsService } from '../services/newsService.js'
import { createSentimentService } from '../services/sentimentService.js'
import type { NewsProvider, NormalizedNewsArticle } from '../providers/newsTypes.js'
import type {
  CompanyProfile,
  HistoricalSeries,
  ReportedFundamentals,
  StockProvider,
  StockQuote,
  StockSearchResult,
} from '../providers/types.js'

export const TEST_CONFIG: AppConfig = {
  port: 0,
  provider: 'fake',
  stockApiKey: 'test-key',
  providerCreditsPerMinute: 10_000,
  providerCreditsPerDay: 100_000,
  newsProvider: 'fake',
  newsApiKey: 'test-news-key',
  newsCreditsPerMinute: 10_000,
  newsCreditsPerDay: 100_000,
  newsPageSize: 12,
  requestTimeoutMs: 1000,
  corsOrigin: '*',
  databasePath: ':memory:',
  sessionTtlSeconds: 3600,
  authCookieName: 'st_session',
  cookieSecure: false,
  cacheTtl: { quote: 1000, history: 1000, search: 1000, profile: 1000, financials: 1000, news: 1000 },
}

function makeQuote(symbol: string): StockQuote {
  return {
    symbol,
    name: `${symbol} Inc.`,
    exchange: 'NASDAQ',
    currency: 'USD',
    price: 123.45,
    change: 1.23,
    changePercent: 1.01,
    previousClose: 122.22,
    open: 122.5,
    high: 124,
    low: 121.9,
    volume: 1_000_000,
    averageVolume: 900_000,
    high52Week: 150,
    low52Week: 90,
    isMarketOpen: true,
    timestamp: Date.now(),
    dataStatus: 'real-time',
  }
}

class StubProvider implements StockProvider {
  readonly name = 'fake'
  readonly configured = true
  readonly dataStatus = 'real-time' as const
  readonly dataStatusNote = 'Stub provider for auth/watchlist tests.'

  async searchStocks(query: string): Promise<StockSearchResult[]> {
    return [
      {
        symbol: query.toUpperCase(),
        name: `${query.toUpperCase()} Inc.`,
        exchange: 'NASDAQ',
        currency: 'USD',
        instrumentType: 'Common Stock',
        country: 'United States',
      },
    ]
  }

  async getQuote(symbol: string): Promise<StockQuote | null> {
    return symbol === 'ZZZZ' ? null : makeQuote(symbol)
  }

  async getQuotes(symbols: string[]): Promise<Map<string, StockQuote>> {
    const map = new Map<string, StockQuote>()
    for (const symbol of symbols) if (symbol !== 'ZZZZ') map.set(symbol, makeQuote(symbol))
    return map
  }

  async getHistoricalPrices(symbol: string, range: ChartRange): Promise<HistoricalSeries | null> {
    return {
      symbol,
      range,
      interval: '1day',
      currency: 'USD',
      exchange: 'NASDAQ',
      dataStatus: 'end-of-day',
      // Deterministic session used by alert-evaluation tests: the baseline is
      // 100 and the latest price is 150 (+50%).
      points: [
        { timestamp: 1_700_000_000_000, label: 'open', value: 100 },
        { timestamp: 1_700_003_600_000, label: 'close', value: 150 },
      ],
    }
  }

  async getCompanyProfile(symbol: string): Promise<CompanyProfile | null> {
    return {
      symbol,
      name: `${symbol} Inc.`,
      exchange: 'NASDAQ',
      currency: 'USD',
      sector: null,
      industry: null,
      website: null,
      description: null,
      marketCap: null,
      employees: null,
      country: null,
      ceo: null,
      limited: true,
      limitationReason: 'stub',
    }
  }

  async getStatistics(symbol: string): Promise<ReportedFundamentals | null> {
    return {
      symbol,
      currency: 'USD',
      exchange: 'NASDAQ',
      marketCap: null,
      trailingPe: null,
      eps: null,
      dividendYieldPercent: null,
      revenue: null,
      revenuePeriod: null,
    }
  }
}

export interface TestApp {
  app: Express
  db: DatabaseConnection
  config: AppConfig
  newsProvider: StubNewsProvider
}

/** Deterministic news used across tests (dates are fixed timestamps). */
export function stubNewsArticles(): NormalizedNewsArticle[] {
  return [
    {
      id: 'n1',
      headline: 'Company beats earnings as shares surge',
      summary: 'Strong growth and a raised dividend.',
      source: 'Test Wire',
      url: 'https://example.com/n1',
      publishedAt: 5,
      tickers: ['AAPL'],
      thumbnail: null,
      category: 'company news',
      language: 'en',
    },
    {
      id: 'n2',
      headline: 'Regulator opens probe; shares fall',
      summary: 'Investors weigh the risk.',
      source: 'Test Wire',
      url: 'https://example.com/n2',
      publishedAt: 4,
      tickers: ['AAPL'],
      thumbnail: null,
      category: 'company news',
      language: 'en',
    },
    {
      id: 'n3',
      headline: 'Analyst upgrade lifts outlook',
      summary: null,
      source: 'Test Wire',
      url: 'https://example.com/n3',
      publishedAt: 3,
      tickers: ['AAPL'],
      thumbnail: null,
      category: 'company news',
      language: 'en',
    },
    {
      id: 'n4',
      headline: 'Routine filing notes no material change',
      summary: null,
      source: 'Test Wire',
      url: 'https://example.com/n4',
      publishedAt: 2,
      tickers: [],
      thumbnail: null,
      category: 'general',
      language: 'en',
    },
    // Duplicate id (older) — must be dropped in favour of n2 above.
    {
      id: 'n2',
      headline: 'Duplicate id should be dropped',
      summary: null,
      source: 'Test Wire',
      url: 'https://example.com/dup-id',
      publishedAt: 1,
      tickers: [],
      thumbnail: null,
      category: 'general',
      language: 'en',
    },
    // Duplicate url (older) — must be dropped in favour of n1 above.
    {
      id: 'n5',
      headline: 'Duplicate url should be dropped',
      summary: null,
      source: 'Test Wire',
      url: 'https://example.com/n1',
      publishedAt: 0,
      tickers: [],
      thumbnail: null,
      category: 'general',
      language: 'en',
    },
  ]
}

export class StubNewsProvider implements NewsProvider {
  readonly name = 'fake-news'
  readonly note = 'Stub news provider for tests.'
  configured = true
  calls = 0
  failure: Error | null = null

  async getCompanyNews(): Promise<NormalizedNewsArticle[]> {
    this.calls += 1
    if (this.failure) throw this.failure
    return stubNewsArticles()
  }

  async getMarketNews(): Promise<NormalizedNewsArticle[]> {
    this.calls += 1
    if (this.failure) throw this.failure
    return stubNewsArticles()
  }
}

/** Builds an app backed by a fresh in-memory SQLite database. */
export function createTestApp(overrides: Partial<AppConfig> = {}): TestApp {
  const config: AppConfig = { ...TEST_CONFIG, ...overrides }
  const service = new MarketDataService(
    new StubProvider(),
    new TTLCache(),
    config.cacheTtl,
    new ProviderBudget(config.providerCreditsPerMinute, config.providerCreditsPerDay),
  )
  const newsProvider = new StubNewsProvider()
  const newsService = new NewsService(
    newsProvider,
    new TTLCache(),
    config.cacheTtl.news,
    new ProviderBudget(config.newsCreditsPerMinute, config.newsCreditsPerDay),
    createSentimentService(),
    config.newsPageSize,
  )
  const db = openDatabase({ databasePath: ':memory:' })
  const app = createApp({ config, service, newsService, database: db })
  return { app, db, config, newsProvider }
}

/** Extracts a `name=value` cookie pair from a response's Set-Cookie header. */
export function readSessionCookie(
  setCookie: string | string[] | undefined,
  name = 'st_session',
): string | undefined {
  if (!setCookie) return undefined
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie]
  const match = cookies.find((cookie) => cookie.startsWith(`${name}=`))
  return match?.split(';')[0]
}
