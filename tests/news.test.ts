import { describe, expect, it } from 'vitest'
import {
  filterNewsArticles,
  mergeNewsArticles,
  MARKET_NEWS_CATEGORIES,
} from '@/lib/news'
import type { NewsArticle } from '@/types'

function article(overrides: Partial<NewsArticle> & { id: string }): NewsArticle {
  return {
    headline: 'Headline',
    summary: null,
    source: 'Wire',
    url: null,
    publishedAt: '2025-01-01T00:00:00.000Z',
    tickers: [],
    category: 'general',
    thumbnail: null,
    sentiment: 'neutral',
    sentimentScore: 0,
    ...overrides,
  }
}

describe('MARKET_NEWS_CATEGORIES', () => {
  it('exposes the categories the API accepts', () => {
    expect(MARKET_NEWS_CATEGORIES.map((entry) => entry.value)).toEqual([
      'general',
      'forex',
      'crypto',
      'merger',
    ])
  })
})

describe('mergeNewsArticles', () => {
  it('orders newest first', () => {
    const merged = mergeNewsArticles([
      article({ id: 'a', publishedAt: '2025-01-01T00:00:00.000Z' }),
      article({ id: 'b', publishedAt: '2025-01-03T00:00:00.000Z' }),
      article({ id: 'c', publishedAt: '2025-01-02T00:00:00.000Z' }),
    ])
    expect(merged.map((item) => item.id)).toEqual(['b', 'c', 'a'])
  })

  it('drops duplicate ids across pages', () => {
    const merged = mergeNewsArticles(
      [article({ id: 'a' }), article({ id: 'b' })],
      [article({ id: 'b' }), article({ id: 'c' })],
    )
    expect(merged.map((item) => item.id)).toEqual(['a', 'b', 'c'])
  })

  it('drops duplicate urls', () => {
    const merged = mergeNewsArticles([
      article({ id: 'a', url: 'https://example.com/x' }),
      article({ id: 'b', url: 'https://example.com/x' }),
    ])
    expect(merged.map((item) => item.id)).toEqual(['a'])
  })

  it('keeps articles with null urls', () => {
    const merged = mergeNewsArticles([
      article({ id: 'a', url: null }),
      article({ id: 'b', url: null }),
    ])
    expect(merged).toHaveLength(2)
  })
})

describe('filterNewsArticles', () => {
  const list = [
    article({
      id: 'a',
      headline: 'Chipmakers rally',
      source: 'Ticker Tribune',
      summary: 'Semiconductor demand improves',
      tickers: ['NVDA'],
      sentiment: 'positive',
    }),
    article({
      id: 'b',
      headline: 'Retailer warns on margins',
      source: 'Capital Brief',
      summary: null,
      tickers: ['WMT'],
      sentiment: 'negative',
    }),
  ]

  it('filters by sentiment', () => {
    expect(filterNewsArticles(list, { sentiment: 'negative' }).map((a) => a.id)).toEqual(['b'])
  })

  it('filters by headline, source, summary, or ticker', () => {
    expect(filterNewsArticles(list, { query: 'chip' }).map((a) => a.id)).toEqual(['a'])
    expect(filterNewsArticles(list, { query: 'capital' }).map((a) => a.id)).toEqual(['b'])
    expect(filterNewsArticles(list, { query: 'semiconductor' }).map((a) => a.id)).toEqual(['a'])
    expect(filterNewsArticles(list, { query: 'wmt' }).map((a) => a.id)).toEqual(['b'])
  })

  it('returns everything for an empty filter', () => {
    expect(filterNewsArticles(list, {})).toHaveLength(2)
    expect(filterNewsArticles(list)).toHaveLength(2)
  })

  it('combines query and sentiment', () => {
    expect(filterNewsArticles(list, { query: 'a', sentiment: 'positive' }).map((a) => a.id)).toEqual([
      'a',
    ])
  })
})
