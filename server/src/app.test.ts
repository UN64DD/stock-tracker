import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from './app.js'
import type { AppConfig } from './config.js'
import { ProviderBudget } from './lib/budget.js'
import { TTLCache } from './lib/cache.js'
import {
  ProviderAuthError,
  ProviderPlanRestrictedError,
  ProviderRateLimitError,
  UpstreamTimeoutError,
} from './lib/errors.js'
import type { ChartRange } from './lib/validate.js'
import { MarketDataService } from './services/marketDataService.js'
import type {
  CompanyProfile,
  HistoricalSeries,
  ReportedFundamentals,
  StockProvider,
  StockQuote,
  StockSearchResult,
} from './providers/types.js'

const SECRET = 'test-secret-key-do-not-leak'

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

class FakeProvider implements StockProvider {
  readonly name = 'fake'
  readonly configured = true
  readonly dataStatus = 'real-time' as const
  readonly dataStatusNote = 'Fake provider used in tests.'
  failure: Error | null = null
  statisticsFailure: Error | null = null

  private maybeThrow(): void {
    if (this.failure) throw this.failure
  }

  async searchStocks(query: string): Promise<StockSearchResult[]> {
    this.maybeThrow()
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
    this.maybeThrow()
    if (symbol === 'ZZZZ') return null
    return makeQuote(symbol)
  }

  async getQuotes(symbols: string[]): Promise<Map<string, StockQuote>> {
    this.maybeThrow()
    const map = new Map<string, StockQuote>()
    for (const symbol of symbols) {
      if (symbol !== 'ZZZZ') map.set(symbol, makeQuote(symbol))
    }
    return map
  }

  async getHistoricalPrices(symbol: string, range: ChartRange): Promise<HistoricalSeries | null> {
    this.maybeThrow()
    if (symbol === 'ZZZZ') return null
    return {
      symbol,
      range,
      interval: '1day',
      currency: 'USD',
      exchange: 'NASDAQ',
      dataStatus: 'end-of-day',
      points: [
        { timestamp: 1_700_000_000_000, label: 'Nov 14', value: 100 },
        { timestamp: 1_700_086_400_000, label: 'Nov 15', value: 105 },
      ],
    }
  }

  async getCompanyProfile(symbol: string): Promise<CompanyProfile | null> {
    this.maybeThrow()
    if (symbol === 'ZZZZ') return null
    return {
      symbol,
      name: `${symbol} Inc.`,
      exchange: 'NASDAQ',
      currency: 'USD',
      sector: 'Technology',
      industry: 'Consumer Electronics',
      website: 'https://example.com',
      description: 'A fake company.',
      marketCap: 1_000_000_000,
      employees: 1000,
      country: 'US',
      ceo: 'Jane Doe',
      limited: false,
      limitationReason: null,
    }
  }

  async getStatistics(symbol: string): Promise<ReportedFundamentals | null> {
    if (this.statisticsFailure) throw this.statisticsFailure
    this.maybeThrow()
    if (symbol === 'ZZZZ') return null
    return {
      symbol,
      currency: 'USD',
      exchange: 'NASDAQ',
      marketCap: 2_500_000_000_000,
      trailingPe: 28.5,
      eps: 6.12,
      dividendYieldPercent: 0.55,
      revenue: 380_000_000_000,
      revenuePeriod: 'TTM',
    }
  }
}

const testConfig: AppConfig = {
  port: 0,
  provider: 'fake',
  stockApiKey: SECRET,
  providerCreditsPerMinute: 10_000,
  providerCreditsPerDay: 100_000,
  requestTimeoutMs: 1000,
  corsOrigin: '*',
  cacheTtl: { quote: 1000, history: 1000, search: 1000, profile: 1000, financials: 1000 },
}

function buildApp(provider = new FakeProvider()) {
  const service = new MarketDataService(
    provider,
    new TTLCache(),
    testConfig.cacheTtl,
    new ProviderBudget(testConfig.providerCreditsPerMinute, testConfig.providerCreditsPerDay),
  )
  return { app: createApp({ config: testConfig, service }), provider }
}

describe('health', () => {
  it('reports provider configuration', async () => {
    const { app } = buildApp()
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
    expect(res.body.provider).toMatchObject({ name: 'fake', configured: true })
  })
})

describe('stock search', () => {
  it('returns results for a valid query', async () => {
    const { app } = buildApp()
    const res = await request(app).get('/api/stocks/search').query({ q: 'AAPL' })
    expect(res.status).toBe(200)
    expect(res.body.data[0].symbol).toBe('AAPL')
    expect(res.body.meta.provider).toBe('fake')
  })

  it('rejects a missing query', async () => {
    const { app } = buildApp()
    const res = await request(app).get('/api/stocks/search')
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('validation_error')
  })
})

describe('quotes', () => {
  it('returns a valid quote', async () => {
    const { app } = buildApp()
    const res = await request(app).get('/api/stocks/AAPL/quote')
    expect(res.status).toBe(200)
    expect(res.body.data.price).toBeCloseTo(123.45)
    expect(res.body.data.dataStatus).toBe('real-time')
  })

  it('404s for an unknown ticker', async () => {
    const { app } = buildApp()
    const res = await request(app).get('/api/stocks/ZZZZ/quote')
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('not_found')
  })

  it('rejects an invalid symbol', async () => {
    const { app } = buildApp()
    const res = await request(app).get('/api/stocks/%20bad%20symbol/quote')
    expect(res.status).toBe(400)
  })

  it('supports batch quotes', async () => {
    const { app } = buildApp()
    const res = await request(app).get('/api/stocks/quotes').query({ symbols: 'AAPL,MSFT,ZZZZ' })
    expect(res.status).toBe(200)
    expect(Object.keys(res.body.data.quotes)).toEqual(['AAPL', 'MSFT'])
    expect(res.body.data.missing).toEqual(['ZZZZ'])
  })
})

describe('history', () => {
  it('returns a series for a supported range', async () => {
    const { app } = buildApp()
    const res = await request(app).get('/api/stocks/AAPL/history').query({ range: '3M' })
    expect(res.status).toBe(200)
    expect(res.body.data.range).toBe('3M')
    expect(res.body.data.points).toHaveLength(2)
  })

  it.each(['1D', '1W', '1M', '3M', '6M', '1Y', '5Y'])(
    'accepts the supported %s range',
    async (range) => {
      const { app } = buildApp()
      const res = await request(app).get('/api/stocks/AAPL/history').query({ range })
      expect(res.status).toBe(200)
      expect(res.body.data.range).toBe(range)
    },
  )

  it('rejects an unsupported range', async () => {
    const { app } = buildApp()
    const res = await request(app).get('/api/stocks/AAPL/history').query({ range: '2Y' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('validation_error')
  })

  it('404s for an empty historical dataset', async () => {
    const { app } = buildApp()
    const res = await request(app).get('/api/stocks/ZZZZ/history').query({ range: '1M' })
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('not_found')
  })

  it('serves cached results when switching back to a previous range', async () => {
    const { app, provider } = buildApp()
    let calls = 0
    const original = provider.getHistoricalPrices.bind(provider)
    provider.getHistoricalPrices = (symbol, range) => {
      calls += 1
      return original(symbol, range)
    }

    await request(app).get('/api/stocks/AAPL/history').query({ range: '1M' })
    await request(app).get('/api/stocks/AAPL/history').query({ range: '3M' })
    const back = await request(app).get('/api/stocks/AAPL/history').query({ range: '1M' })

    expect(back.body.data.range).toBe('1M')
    expect(back.headers['x-data-cache']).toBe('hit')
    expect(calls).toBe(2)
  })
})

describe('financials', () => {
  it('returns live metrics plus reported fundamentals when available', async () => {
    const { app } = buildApp()
    const res = await request(app).get('/api/stocks/AAPL/financials')
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({
      symbol: 'AAPL',
      marketCap: 2_500_000_000_000,
      trailingPe: 28.5,
      eps: 6.12,
      dividendYieldPercent: 0.55,
      high52Week: 150,
      low52Week: 90,
      averageVolume: 900_000,
      revenuePeriod: 'TTM',
      limited: false,
      limitationReason: null,
    })
  })

  it('degrades to live metrics when reported fundamentals are plan-restricted', async () => {
    const provider = new FakeProvider()
    provider.statisticsFailure = new ProviderPlanRestrictedError()
    const { app } = buildApp(provider)
    const res = await request(app).get('/api/stocks/AAPL/financials')
    expect(res.status).toBe(200)
    expect(res.body.data.limited).toBe(true)
    expect(res.body.data.limitationReason).toBeTruthy()
    // Missing reported metrics stay null, never silently zero.
    expect(res.body.data.marketCap).toBeNull()
    expect(res.body.data.trailingPe).toBeNull()
    expect(res.body.data.eps).toBeNull()
    expect(res.body.data.dividendYieldPercent).toBeNull()
    expect(res.body.data.revenue).toBeNull()
    // Live market data is still populated.
    expect(res.body.data.high52Week).toBe(150)
    expect(res.body.data.averageVolume).toBe(900_000)
  })

  it('404s when the symbol has no quote', async () => {
    const { app } = buildApp()
    const res = await request(app).get('/api/stocks/ZZZZ/financials')
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('not_found')
  })

  it('maps reported-fundamental provider failures safely', async () => {
    const provider = new FakeProvider()
    provider.statisticsFailure = new ProviderRateLimitError(30)
    const { app } = buildApp(provider)
    const res = await request(app).get('/api/stocks/AAPL/financials')
    expect(res.status).toBe(429)
    expect(res.body.error.code).toBe('provider_rate_limited')
  })
})

describe('profile', () => {
  it('returns a full profile when the plan supports it', async () => {
    const { app } = buildApp()
    const res = await request(app).get('/api/stocks/AAPL/profile')
    expect(res.status).toBe(200)
    expect(res.body.data.sector).toBe('Technology')
    expect(res.body.data.limited).toBe(false)
  })

  it('degrades to a partial profile when the plan is restricted', async () => {
    const provider = new FakeProvider()
    provider.getCompanyProfile = async () => {
      throw new ProviderPlanRestrictedError()
    }
    const { app } = buildApp(provider)
    const res = await request(app).get('/api/stocks/AAPL/profile')
    expect(res.status).toBe(200)
    expect(res.body.data.limited).toBe(true)
    expect(res.body.data.sector).toBeNull()
    expect(res.body.data.name).toBe('AAPL Inc.')
  })
})

describe('provider failures', () => {
  it('maps provider auth failures to a safe 502', async () => {
    const provider = new FakeProvider()
    provider.failure = new ProviderAuthError('bad key: ' + SECRET)
    const { app } = buildApp(provider)
    const res = await request(app).get('/api/stocks/AAPL/quote')
    expect(res.status).toBe(502)
    expect(res.body.error.code).toBe('provider_auth_error')
    expect(JSON.stringify(res.body)).not.toContain(SECRET)
  })

  it('maps provider rate limits to 429', async () => {
    const provider = new FakeProvider()
    provider.failure = new ProviderRateLimitError(30)
    const { app } = buildApp(provider)
    const res = await request(app).get('/api/stocks/AAPL/quote')
    expect(res.status).toBe(429)
    expect(res.body.error.code).toBe('provider_rate_limited')
    expect(res.headers['retry-after']).toBe('30')
  })

  it('maps provider timeouts to 504', async () => {
    const provider = new FakeProvider()
    provider.failure = new UpstreamTimeoutError()
    const { app } = buildApp(provider)
    const res = await request(app).get('/api/stocks/AAPL/history').query({ range: '1M' })
    expect(res.status).toBe(504)
    expect(res.body.error.code).toBe('provider_timeout')
  })
})
