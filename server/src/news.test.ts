import request from 'supertest'
import { describe, expect, it } from 'vitest'
import {
  ProviderAuthError,
  ProviderRateLimitError,
} from './lib/errors.js'
import { createTestApp, stubNewsArticles, TEST_CONFIG } from './testing/fakes.js'

describe('GET /api/news/market', () => {
  it('returns de-duplicated, analyzed articles with cache metadata', async () => {
    const { app, newsProvider } = createTestApp()

    const res = await request(app).get('/api/news/market')

    expect(res.status).toBe(200)
    expect(res.headers['x-data-cache']).toBe('miss')
    expect(res.body.meta).toMatchObject({ provider: 'fake-news', cached: false, stale: false })

    const feed = res.body.data
    expect(feed.scope).toBe('market')
    expect(feed.category).toBe('general')
    // 6 raw rows collapse to 4 unique articles (duplicate id + duplicate url).
    expect(feed.total).toBe(4)
    expect(feed.articles).toHaveLength(4)
    expect(stubNewsArticles()).toHaveLength(6)

    const ids = feed.articles.map((article: { id: string }) => article.id)
    expect(new Set(ids).size).toBe(ids.length)

    expect(feed.sentiment.articleCount).toBe(4)
    expect(feed.sentiment.label).toBe('positive')
    expect(newsProvider.calls).toBe(1)
  })

  it('serves subsequent requests from cache', async () => {
    const { app, newsProvider } = createTestApp()

    await request(app).get('/api/news/market')
    const second = await request(app).get('/api/news/market')

    expect(second.headers['x-data-cache']).toBe('hit')
    expect(second.body.meta.cached).toBe(true)
    expect(newsProvider.calls).toBe(1)
  })

  it('paginates without re-fetching', async () => {
    const { app, newsProvider } = createTestApp()

    const first = await request(app).get('/api/news/market?page=1&pageSize=2')
    expect(first.body.data.articles).toHaveLength(2)
    expect(first.body.data.hasMore).toBe(true)

    const second = await request(app).get('/api/news/market?page=2&pageSize=2')
    expect(second.body.data.articles).toHaveLength(2)
    expect(second.body.data.hasMore).toBe(false)

    const third = await request(app).get('/api/news/market?page=3&pageSize=2')
    expect(third.body.data.articles).toHaveLength(0)
    expect(third.body.data.hasMore).toBe(false)

    expect(newsProvider.calls).toBe(1)
  })

  it('returns 400 for an unknown category', async () => {
    const { app } = createTestApp()
    const res = await request(app).get('/api/news/market?category=politics')
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('validation_error')
  })
})

describe('GET /api/news', () => {
  it('requires a symbol', async () => {
    const { app } = createTestApp()
    const res = await request(app).get('/api/news')
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('validation_error')
  })

  it('returns company news for a symbol', async () => {
    const { app } = createTestApp()
    const res = await request(app).get('/api/news?symbol=aapl')
    expect(res.status).toBe(200)
    expect(res.body.data.scope).toBe('company')
    expect(res.body.data.symbol).toBe('AAPL')
    expect(res.body.data.articles.length).toBeGreaterThan(0)
  })
})

describe('GET /api/news error handling', () => {
  it('returns 503 when the news provider is not configured', async () => {
    const { app, newsProvider } = createTestApp()
    newsProvider.configured = false

    const res = await request(app).get('/api/news/market')
    expect(res.status).toBe(503)
    expect(res.body.error.code).toBe('not_configured')
  })

  it('does not cache provider failures', async () => {
    const { app, newsProvider } = createTestApp()

    newsProvider.failure = new ProviderRateLimitError(30)
    const failed = await request(app).get('/api/news/market')
    expect(failed.status).toBe(429)
    expect(failed.body.error.code).toBe('provider_rate_limited')

    newsProvider.failure = null
    const recovered = await request(app).get('/api/news/market')
    expect(recovered.status).toBe(200)
    expect(recovered.headers['x-data-cache']).toBe('miss')
  })

  it('maps provider auth failures without leaking details', async () => {
    const { app, newsProvider } = createTestApp()
    newsProvider.failure = new ProviderAuthError()

    const res = await request(app).get('/api/news/market')
    expect(res.status).toBe(502)
    expect(res.body.error.code).toBe('provider_auth_error')
    expect(JSON.stringify(res.body)).not.toContain('unit-test')
  })

  it('serves stale data when a refresh fails transiently', async () => {
    const { app, newsProvider } = createTestApp({
      cacheTtl: { ...TEST_CONFIG.cacheTtl, news: 1 },
    })

    const first = await request(app).get('/api/news/market')
    expect(first.headers['x-data-cache']).toBe('miss')

    await new Promise((resolve) => setTimeout(resolve, 5))
    newsProvider.failure = new ProviderRateLimitError(30)

    const stale = await request(app).get('/api/news/market')
    expect(stale.status).toBe(200)
    expect(stale.headers['x-data-cache']).toBe('stale')
    expect(stale.body.meta.stale).toBe(true)
  })
})
