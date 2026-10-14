import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProviderPlanRestrictedError } from '../lib/errors.js'
import { TwelveDataProvider } from './twelvedata.js'

const API_KEY = 'unit-test-key'

function stubFetch(body: unknown, status = 200) {
  const fetchMock = vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function makeProvider(): TwelveDataProvider {
  return new TwelveDataProvider(API_KEY, 1000)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('TwelveDataProvider.getHistoricalPrices', () => {
  it('normalizes, sorts, and de-duplicates observations', async () => {
    const fetchMock = stubFetch({
      meta: { symbol: 'AAPL', interval: '1day', currency: 'USD', exchange: 'NASDAQ' },
      values: [
        { datetime: '2024-01-03', close: '103' },
        { datetime: '2024-01-02', close: '101' },
        { datetime: '2024-01-02', close: '101' },
        { datetime: '2024-01-01', close: '' },
        { datetime: 'not-a-date', close: '99' },
        { datetime: '2024-01-04', close: '104' },
      ],
      status: 'ok',
    })

    const series = await makeProvider().getHistoricalPrices('AAPL', '6M')

    expect(series).not.toBeNull()
    expect(series?.interval).toBe('1day')
    expect(series?.currency).toBe('USD')
    expect(series?.points.map((point) => point.value)).toEqual([101, 103, 104])
    const timestamps = series?.points.map((point) => point.timestamp) ?? []
    expect([...timestamps].sort((a, b) => a - b)).toEqual(timestamps)

    const url = String(fetchMock.mock.calls[0][0])
    expect(url).toContain('/time_series')
    expect(url).toContain('interval=1day')
    expect(url).toContain('outputsize=183')
  })

  it('maps the 5Y range to weekly bars', async () => {
    const fetchMock = stubFetch({
      meta: { symbol: 'AAPL', interval: '1week' },
      values: [{ datetime: '2023-01-06', close: '150' }],
      status: 'ok',
    })

    await makeProvider().getHistoricalPrices('AAPL', '5Y')

    const url = String(fetchMock.mock.calls[0][0])
    expect(url).toContain('interval=1week')
    expect(url).toContain('outputsize=261')
  })

  it('returns null for an empty dataset', async () => {
    stubFetch({ meta: { symbol: 'AAPL' }, values: [], status: 'ok' })
    await expect(makeProvider().getHistoricalPrices('AAPL', '1M')).resolves.toBeNull()
  })

  it('returns null when every observation is invalid', async () => {
    stubFetch({
      meta: { symbol: 'AAPL' },
      values: [{ datetime: 'bad', close: 'nope' }],
      status: 'ok',
    })
    await expect(makeProvider().getHistoricalPrices('AAPL', '1M')).resolves.toBeNull()
  })
})

describe('TwelveDataProvider.getStatistics', () => {
  it('parses nested fundamentals and normalizes the dividend yield', async () => {
    stubFetch({
      meta: { symbol: 'AAPL', currency: 'USD', exchange: 'NASDAQ' },
      statistics: {
        valuations_metrics: { market_capitalization: 2_546_807_865_344, trailing_pe: 30.162 },
        financials: { income_statement: { diluted_eps_ttm: 5.108, revenue_ttm: 347_155_005_440 } },
        dividends_and_splits: { trailing_annual_dividend_yield: 0.0053832764 },
      },
      status: 'ok',
    })

    const stats = await makeProvider().getStatistics('AAPL')

    expect(stats).not.toBeNull()
    expect(stats?.marketCap).toBe(2_546_807_865_344)
    expect(stats?.trailingPe).toBeCloseTo(30.162)
    expect(stats?.eps).toBeCloseTo(5.108)
    expect(stats?.revenue).toBe(347_155_005_440)
    expect(stats?.revenuePeriod).toBe('TTM')
    expect(stats?.dividendYieldPercent).toBeCloseTo(0.53832764)
  })

  it('keeps unavailable fields null rather than zero', async () => {
    stubFetch({
      meta: { symbol: 'AAPL' },
      statistics: {},
      status: 'ok',
    })

    const stats = await makeProvider().getStatistics('AAPL')

    expect(stats?.marketCap).toBeNull()
    expect(stats?.trailingPe).toBeNull()
    expect(stats?.eps).toBeNull()
    expect(stats?.dividendYieldPercent).toBeNull()
    expect(stats?.revenue).toBeNull()
    expect(stats?.revenuePeriod).toBeNull()
  })

  it('throws a plan-restricted error on 403 responses', async () => {
    stubFetch(
      { code: 403, message: 'upgrade required', status: 'error' },
      403,
    )
    await expect(makeProvider().getStatistics('AAPL')).rejects.toBeInstanceOf(
      ProviderPlanRestrictedError,
    )
  })
})

describe('TwelveDataProvider.getQuote', () => {
  it('parses price, average volume and the 52-week range', async () => {
    stubFetch({
      symbol: 'AAPL',
      name: 'Apple Inc',
      currency: 'USD',
      exchange: 'NASDAQ',
      close: '148.85001',
      change: '-0.23999',
      percent_change: '-0.16097',
      previous_close: '149.09',
      average_volume: '83571571',
      fifty_two_week: { low: '103.1', high: '157.26' },
      is_market_open: false,
      timestamp: 1631772000,
      status: 'ok',
    })

    const quote = await makeProvider().getQuote('AAPL')

    expect(quote?.price).toBeCloseTo(148.85001)
    expect(quote?.averageVolume).toBe(83_571_571)
    expect(quote?.high52Week).toBeCloseTo(157.26)
    expect(quote?.low52Week).toBeCloseTo(103.1)
    expect(quote?.dataStatus).toBe('end-of-day')
  })
})
