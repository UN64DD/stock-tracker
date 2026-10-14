import { fetchJson } from '../lib/http.js'
import {
  ConfigurationError,
  ProviderAuthError,
  ProviderError,
  ProviderRateLimitError,
} from '../lib/errors.js'
import type { MarketNewsCategory } from '../lib/validate.js'
import type { NewsProvider, NormalizedNewsArticle } from './newsTypes.js'

const BASE_URL = 'https://finnhub.io/api/v1'

/** The company-news endpoint is documented for the last 12 months on the free tier. */
const COMPANY_NEWS_WINDOW_MS = 365 * 24 * 60 * 60 * 1000

type RawRecord = Record<string, unknown>

function isRecord(value: unknown): value is RawRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function toHttpUrl(value: unknown): string | null {
  const text = toText(value)
  if (!text) return null
  try {
    const url = new URL(text)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

/** Finnhub reports Unix seconds, but tolerate millisecond values defensively. */
function toTimestampMs(value: unknown): number | null {
  const seconds = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(seconds) || seconds <= 0) return null
  const ms = seconds > 1e12 ? seconds : seconds * 1000
  return Number.isFinite(ms) ? ms : null
}

function parseTickers(value: unknown): string[] {
  const text = toText(value)
  if (!text) return []
  return Array.from(
    new Set(
      text
        .split(',')
        .map((symbol) => symbol.trim().toUpperCase())
        .filter((symbol) => symbol.length > 0),
    ),
  )
}

function formatDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

/**
 * Finnhub-backed news provider. Uses the free-tier `/company-news` and `/news`
 * endpoints, mapping their responses into `NormalizedNewsArticle`. Text is never
 * invented: articles without a headline are dropped and missing fields stay
 * `null`.
 */
export class FinnhubNewsProvider implements NewsProvider {
  readonly name = 'finnhub'
  readonly configured: boolean
  readonly note =
    'Company and general market news via the Finnhub free tier (60 requests/minute, personal/non-commercial use).'

  private readonly apiKey: string | undefined
  private readonly timeoutMs: number

  constructor(apiKey: string | undefined, timeoutMs: number) {
    this.apiKey = apiKey
    this.configured = Boolean(apiKey)
    this.timeoutMs = timeoutMs
  }

  private ensureConfigured(): string {
    if (!this.apiKey) {
      throw new ConfigurationError(
        'FINNHUB_API_KEY is not set. Add a Finnhub API key to server/.env to enable news.',
      )
    }
    return this.apiKey
  }

  private async request(path: string, params: Record<string, string>, signal?: AbortSignal) {
    const apiKey = this.ensureConfigured()
    const search = new URLSearchParams(params)
    const url = `${BASE_URL}/${path}?${search.toString()}`

    const { ok, status, data } = await fetchJson<unknown>(url, {
      timeoutMs: this.timeoutMs,
      // Send the key as a header rather than a query parameter so it does not
      // end up in request URLs or access logs.
      headers: { 'X-Finnhub-Token': apiKey },
      signal,
    })

    if (status === 401 || status === 403) throw new ProviderAuthError()
    if (status === 429) throw new ProviderRateLimitError()
    if (!ok) {
      throw new ProviderError('The news provider rejected the request.', { status: 502 })
    }
    return data
  }

  private normalize(data: unknown): NormalizedNewsArticle[] {
    if (!Array.isArray(data)) {
      // Finnhub returns `{ error: "..." }` on some failures; do not leak it.
      throw new ProviderError('The news provider returned an unexpected response.', {
        status: 502,
      })
    }

    const articles: NormalizedNewsArticle[] = []
    for (const row of data) {
      if (!isRecord(row)) continue
      const headline = toText(row.headline)
      const publishedAt = toTimestampMs(row.datetime)
      const id = row.id === undefined || row.id === null ? null : String(row.id)
      if (!headline || publishedAt === null || !id) continue

      articles.push({
        id,
        headline,
        summary: toText(row.summary),
        source: toText(row.source) ?? 'Unknown source',
        url: toHttpUrl(row.url),
        publishedAt,
        tickers: parseTickers(row.related),
        thumbnail: toHttpUrl(row.image),
        category: toText(row.category) ?? 'general',
        language: toText(row.language),
      })
    }
    return articles
  }

  async getCompanyNews(
    symbol: string,
    from: number,
    to: number,
    signal?: AbortSignal,
  ): Promise<NormalizedNewsArticle[]> {
    const now = Date.now()
    const start = Math.min(from, to)
    const end = Math.max(from, to)
    const clampedStart = Math.max(start, now - COMPANY_NEWS_WINDOW_MS)
    const data = await this.request(
      'company-news',
      {
        symbol,
        from: formatDate(clampedStart),
        to: formatDate(end > now ? now : end),
      },
      signal,
    )
    return this.normalize(data)
  }

  async getMarketNews(
    category: MarketNewsCategory,
    signal?: AbortSignal,
  ): Promise<NormalizedNewsArticle[]> {
    const data = await this.request('news', { category }, signal)
    return this.normalize(data)
  }
}
