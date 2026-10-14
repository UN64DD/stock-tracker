import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ConfigurationError,
  ProviderAuthError,
  ProviderRateLimitError,
} from '../lib/errors.js'
import { FinnhubNewsProvider } from './finnhubNews.js'

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

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('FinnhubNewsProvider.getCompanyNews', () => {
  it('normalizes articles, parsing tickers and unix timestamps', async () => {
    const fetchMock = stubFetch([
      {
        category: 'company news',
        datetime: 1_600_000_000,
        headline: 'Apple unveils new products',
        id: 42,
        image: 'https://cdn.example.com/a.jpg',
        related: 'AAPL, MSFT',
        source: 'Test Wire',
        summary: 'A summary.',
        url: 'https://example.com/a',
      },
      {
        // Missing headline -> dropped; missing optional fields stay null.
        datetime: 1_600_000_100,
        id: 43,
        related: '',
      },
    ])

    const articles = await new FinnhubNewsProvider(API_KEY, 1000).getCompanyNews(
      'AAPL',
      Date.UTC(2025, 0, 1),
      Date.UTC(2025, 5, 1),
    )

    expect(articles).toHaveLength(1)
    expect(articles[0]).toMatchObject({
      id: '42',
      headline: 'Apple unveils new products',
      source: 'Test Wire',
      url: 'https://example.com/a',
      tickers: ['AAPL', 'MSFT'],
      category: 'company news',
    })
    expect(articles[0].publishedAt).toBe(1_600_000_000_000)

    const url = String(fetchMock.mock.calls[0][0])
    expect(url).toContain('/company-news')
    expect(url).toContain('symbol=AAPL')
    expect(url).toContain('from=')
    expect(url).toContain('to=')

    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect((init.headers as Record<string, string>)['X-Finnhub-Token']).toBe(API_KEY)
  })

  it('drops non-http thumbnails and urls', async () => {
    stubFetch([
      {
        datetime: 1_600_000_000,
        headline: 'Headline',
        id: 1,
        image: 'javascript:alert(1)',
        related: '',
        source: 'Wire',
        summary: null,
        url: 'ftp://example.com/a',
      },
    ])

    const articles = await new FinnhubNewsProvider(API_KEY, 1000).getMarketNews('general')
    expect(articles[0].thumbnail).toBeNull()
    expect(articles[0].url).toBeNull()
  })
})

describe('FinnhubNewsProvider errors', () => {
  it('throws a configuration error without a key', async () => {
    await expect(
      new FinnhubNewsProvider(undefined, 1000).getMarketNews('general'),
    ).rejects.toBeInstanceOf(ConfigurationError)
  })

  it('maps 401 to an auth error', async () => {
    stubFetch({ error: 'invalid token' }, 401)
    await expect(
      new FinnhubNewsProvider(API_KEY, 1000).getMarketNews('general'),
    ).rejects.toBeInstanceOf(ProviderAuthError)
  })

  it('maps 429 to a rate-limit error', async () => {
    stubFetch({ error: 'rate limited' }, 429)
    await expect(
      new FinnhubNewsProvider(API_KEY, 1000).getMarketNews('general'),
    ).rejects.toBeInstanceOf(ProviderRateLimitError)
  })

  it('rejects a non-array response body', async () => {
    stubFetch({ error: 'unexpected' }, 200)
    await expect(
      new FinnhubNewsProvider(API_KEY, 1000).getMarketNews('general'),
    ).rejects.toThrow()
  })
})
