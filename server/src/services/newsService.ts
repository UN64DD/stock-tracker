import { TTLCache } from '../lib/cache.js'
import type { ProviderBudget } from '../lib/budget.js'
import {
  ProviderError,
  ProviderRateLimitError,
  UpstreamTimeoutError,
} from '../lib/errors.js'
import type { MarketNewsCategory } from '../lib/validate.js'
import type { CacheResult } from './marketDataService.js'
import type { NewsProvider, NormalizedNewsArticle } from '../providers/newsTypes.js'
import type { SentimentLabel, SentimentService, SentimentSummary } from './sentimentService.js'

/** Company news is fetched over a rolling 12-month window (the free-tier limit). */
const COMPANY_NEWS_WINDOW_MS = 365 * 24 * 60 * 60 * 1000

/** Upper bound on cached per-article sentiment results. */
const MAX_ANALYSIS_ENTRIES = 2000

export interface NewsArticleDto {
  id: string
  headline: string
  summary: string | null
  source: string
  url: string | null
  /** ISO-8601 timestamp. */
  publishedAt: string
  tickers: string[]
  category: string
  thumbnail: string | null
  sentiment: SentimentLabel
  sentimentScore: number
}

export interface NewsFeed {
  scope: 'company' | 'market'
  symbol: string | null
  category: MarketNewsCategory | null
  page: number
  pageSize: number
  total: number
  hasMore: boolean
  articles: NewsArticleDto[]
  /** Aggregate over the full fetched set, not just the current page. */
  sentiment: SentimentSummary
}

export interface NewsProviderInfo {
  name: string
  configured: boolean
  note: string
}

interface CachedAnalysis {
  hash: string
  sentiment: SentimentLabel
  score: number
}

function isTransient(error: unknown): boolean {
  if (error instanceof ProviderRateLimitError) return true
  if (error instanceof UpstreamTimeoutError) return true
  if (error instanceof ProviderError) return (error.status ?? 502) >= 500
  return false
}

/**
 * Provider-agnostic news facade. Fetches a scope's articles once, normalizes,
 * de-duplicates, scores sentiment, and caches the processed list; pagination and
 * filtering then happen in memory so page flips do not re-hit the provider.
 * Errors are never cached as data — a transient failure only serves a stale
 * copy when one already exists.
 */
export class NewsService {
  private readonly analysis = new Map<string, CachedAnalysis>()

  constructor(
    private readonly provider: NewsProvider,
    private readonly cache: TTLCache,
    private readonly ttlMs: number,
    private readonly budget: ProviderBudget,
    private readonly sentiment: SentimentService,
    private readonly pageSize: number,
  ) {}

  getProviderInfo(): NewsProviderInfo {
    return {
      name: this.provider.name,
      configured: this.provider.configured,
      note: this.provider.note,
    }
  }

  /** Default page size from configuration, used when a route omits one. */
  get defaultPageSize(): number {
    return this.pageSize
  }

  private async withCache(
    key: string,
    fetcher: (signal?: AbortSignal) => Promise<NormalizedNewsArticle[]>,
    signal?: AbortSignal,
  ): Promise<CacheResult<NewsArticleDto[]>> {
    const hit = this.cache.get<NewsArticleDto[]>(key)
    if (hit?.fresh) {
      return { data: hit.value, cached: true, stale: false, fetchedAt: hit.storedAt }
    }

    try {
      this.budget.consume(1)
      const raw = await fetcher(signal)
      const processed = this.process(raw)
      this.cache.set(key, processed, this.ttlMs)
      return { data: processed, cached: false, stale: false, fetchedAt: Date.now() }
    } catch (error) {
      if (hit && isTransient(error)) {
        return { data: hit.value, cached: true, stale: true, fetchedAt: hit.storedAt }
      }
      throw error
    }
  }

  private analyze(article: NormalizedNewsArticle): CachedAnalysis {
    const hash = `${article.headline}\u0000${article.summary ?? ''}`
    const cached = this.analysis.get(article.id)
    if (cached && cached.hash === hash) return cached

    const result = this.sentiment.analyzeArticle(article)
    const entry: CachedAnalysis = { hash, sentiment: result.label, score: result.score }
    if (this.analysis.size >= MAX_ANALYSIS_ENTRIES) {
      const oldest = this.analysis.keys().next().value
      if (oldest !== undefined) this.analysis.delete(oldest)
    }
    this.analysis.set(article.id, entry)
    return entry
  }

  private process(articles: NormalizedNewsArticle[]): NewsArticleDto[] {
    const ordered = [...articles].sort((a, b) => b.publishedAt - a.publishedAt)
    const seenIds = new Set<string>()
    const seenUrls = new Set<string>()
    const result: NewsArticleDto[] = []

    for (const article of ordered) {
      if (!article.headline) continue
      if (seenIds.has(article.id)) continue
      if (article.url && seenUrls.has(article.url)) continue

      seenIds.add(article.id)
      if (article.url) seenUrls.add(article.url)

      const analysis = this.analyze(article)
      result.push({
        id: article.id,
        headline: article.headline,
        summary: article.summary,
        source: article.source,
        url: article.url,
        publishedAt: new Date(article.publishedAt).toISOString(),
        tickers: article.tickers,
        category: article.category,
        thumbnail: article.thumbnail,
        sentiment: analysis.sentiment,
        sentimentScore: analysis.score,
      })
    }
    return result
  }

  private paginate(
    items: NewsArticleDto[],
    scope: NewsFeed['scope'],
    page: number,
    pageSize: number,
    extra: { symbol?: string; category?: MarketNewsCategory },
  ): NewsFeed {
    const total = items.length
    const start = (page - 1) * pageSize
    const articles = items.slice(start, start + pageSize)
    return {
      scope,
      symbol: extra.symbol ?? null,
      category: extra.category ?? null,
      page,
      pageSize,
      total,
      hasMore: start + pageSize < total,
      articles,
      sentiment: this.sentiment.summarizeSentiment(items),
    }
  }

  async companyNews(
    symbol: string,
    page: number,
    pageSize: number = this.pageSize,
    signal?: AbortSignal,
  ): Promise<CacheResult<NewsFeed>> {
    const now = Date.now()
    const result = await this.withCache(
      `news:company:${symbol}`,
      (innerSignal) =>
        this.provider.getCompanyNews(symbol, now - COMPANY_NEWS_WINDOW_MS, now, innerSignal),
      signal,
    )
    return { ...result, data: this.paginate(result.data, 'company', page, pageSize, { symbol }) }
  }

  async marketNews(
    category: MarketNewsCategory,
    page: number,
    pageSize: number = this.pageSize,
    signal?: AbortSignal,
  ): Promise<CacheResult<NewsFeed>> {
    const result = await this.withCache(
      `news:market:${category}`,
      (innerSignal) => this.provider.getMarketNews(category, innerSignal),
      signal,
    )
    return {
      ...result,
      data: this.paginate(result.data, 'market', page, pageSize, { category }),
    }
  }
}
