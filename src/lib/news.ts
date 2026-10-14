import { isApiError } from '@/lib/api'
import type { MarketNewsCategory, NewsArticle, Sentiment } from '@/types'

export const MARKET_NEWS_CATEGORIES: { value: MarketNewsCategory; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'forex', label: 'Forex' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'merger', label: 'M&A' },
]

function publishedAtMs(article: NewsArticle): number {
  const value = new Date(article.publishedAt).getTime()
  return Number.isFinite(value) ? value : 0
}

/**
 * Merges fetched pages into a single newest-first list, dropping duplicate ids
 * and duplicate URLs so overlapping pages (or a stale refresh) never show the
 * same story twice.
 */
export function mergeNewsArticles(...lists: NewsArticle[][]): NewsArticle[] {
  const flat = lists.flat().sort((a, b) => publishedAtMs(b) - publishedAtMs(a))
  const seenIds = new Set<string>()
  const seenUrls = new Set<string>()
  const merged: NewsArticle[] = []

  for (const article of flat) {
    if (seenIds.has(article.id)) continue
    if (article.url && seenUrls.has(article.url)) continue
    seenIds.add(article.id)
    if (article.url) seenUrls.add(article.url)
    merged.push(article)
  }
  return merged
}

export interface NewsFilter {
  query?: string
  sentiment?: Sentiment | 'all'
}

/** Client-side search + sentiment filter over an already-fetched page. */
export function filterNewsArticles(
  articles: NewsArticle[],
  { query = '', sentiment = 'all' }: NewsFilter = {},
): NewsArticle[] {
  const term = query.trim().toLowerCase()
  return articles.filter((article) => {
    const matchesSentiment = sentiment === 'all' || article.sentiment === sentiment
    if (!matchesSentiment) return false
    if (!term) return true

    return (
      article.headline.toLowerCase().includes(term) ||
      article.source.toLowerCase().includes(term) ||
      (article.summary?.toLowerCase().includes(term) ?? false) ||
      article.tickers.some((ticker) => ticker.toLowerCase().includes(term))
    )
  })
}

export interface NewsErrorCopy {
  title: string
  description: string
}

/** True when the server has no news provider configured (HTTP 503). */
export function isNewsConfiguredError(error: unknown): boolean {
  return isApiError(error) && error.code === 'not_configured'
}

/**
 * Turns a failed news request into copy for an empty state. A missing server
 * configuration gets a dedicated setup message rather than a generic error.
 */
export function describeNewsError(error: unknown): NewsErrorCopy {
  if (isApiError(error)) {
    if (error.code === 'not_configured') {
      return {
        title: 'Live news isn’t configured yet',
        description:
          'Add a Finnhub API key to server/.env as FINNHUB_API_KEY and restart the API server to enable live headlines.',
      }
    }
    if (error.code === 'provider_rate_limited') {
      return {
        title: 'News provider is rate-limited',
        description: error.message,
      }
    }
    return { title: 'Live news is unavailable', description: error.message }
  }

  return {
    title: 'Live news is unavailable',
    description: 'Could not reach the API server. Start it with “npm run dev:server”.',
  }
}
