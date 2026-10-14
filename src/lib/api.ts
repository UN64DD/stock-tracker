import type { NewsFeed } from '@/types'

export type DataStatus = 'real-time' | 'delayed' | 'end-of-day' | 'unknown'

export interface ApiMeta {
  provider: string
  cached: boolean
  stale: boolean
  fetchedAt: string
  dataStatus: DataStatus
  dataStatusNote: string
}

export interface ApiEnvelope<T> {
  data: T
  meta: ApiMeta
}

export interface SearchResult {
  symbol: string
  name: string
  exchange: string | null
  currency: string | null
  instrumentType: string | null
  country: string | null
}

export interface Quote {
  symbol: string
  name: string | null
  exchange: string | null
  currency: string | null
  price: number
  change: number | null
  changePercent: number | null
  previousClose: number | null
  open: number | null
  high: number | null
  low: number | null
  volume: number | null
  averageVolume: number | null
  high52Week: number | null
  low52Week: number | null
  isMarketOpen: boolean | null
  timestamp: number | null
  dataStatus: DataStatus
}

export interface HistoricalPoint {
  timestamp: number
  label: string
  value: number
}

export interface HistoricalSeries {
  symbol: string
  range: string
  interval: string
  currency: string | null
  exchange: string | null
  dataStatus: DataStatus
  points: HistoricalPoint[]
}

export interface CompanyProfile {
  symbol: string
  name: string | null
  exchange: string | null
  currency: string | null
  sector: string | null
  industry: string | null
  website: string | null
  description: string | null
  marketCap: number | null
  employees: number | null
  country: string | null
  ceo: string | null
  limited: boolean
  limitationReason: string | null
}

export interface CompanyFinancials {
  symbol: string
  name: string | null
  currency: string | null
  exchange: string | null
  /** Live market metrics. */
  high52Week: number | null
  low52Week: number | null
  averageVolume: number | null
  /** Reported fundamentals for a historical period. */
  marketCap: number | null
  trailingPe: number | null
  eps: number | null
  dividendYieldPercent: number | null
  revenue: number | null
  revenuePeriod: string | null
  dataStatus: DataStatus
  limited: boolean
  limitationReason: string | null
}

export interface BatchQuotes {
  quotes: Record<string, Quote>
  missing: string[]
}

export interface ProviderHealth {
  status: string
  timestamp: string
  uptimeSeconds: number
  provider: {
    name: string
    configured: boolean
    dataStatus: DataStatus
    dataStatusNote: string
  }
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

interface ApiRequestOptions {
  method?: string
  body?: unknown
  signal?: AbortSignal
}

async function apiRequest<T>(
  path: string,
  { method = 'GET', body, signal }: ApiRequestOptions = {},
): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      signal,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch (error) {
    if (isAbortError(error)) throw error
    throw new ApiError(
      0,
      'network_error',
      'Could not reach the market data service. Make sure the API server is running.',
    )
  }

  const responseBody = (await response.json().catch(() => null)) as
    | { error?: { code?: string; message?: string; details?: unknown } }
    | T
    | null

  if (!response.ok) {
    const errorBody = responseBody as
      | { error?: { code?: string; message?: string; details?: unknown } }
      | null
    throw new ApiError(
      response.status,
      errorBody?.error?.code ?? 'request_failed',
      errorBody?.error?.message ?? `Request failed with status ${response.status}.`,
      errorBody?.error?.details,
    )
  }

  return responseBody as T
}

async function apiFetch<T>(path: string, signal?: AbortSignal): Promise<ApiEnvelope<T>> {
  return apiRequest<ApiEnvelope<T>>(path, { signal })
}

const MAX_BATCH_SYMBOLS = 8

function uniqueSymbols(symbols: string[]): string[] {
  return Array.from(new Set(symbols.map((symbol) => symbol.toUpperCase())))
}

async function fetchQuotesChunk(
  symbols: string[],
  signal?: AbortSignal,
): Promise<ApiEnvelope<BatchQuotes>> {
  const params = new URLSearchParams({ symbols: symbols.join(',') })
  return apiFetch<BatchQuotes>(`/api/stocks/quotes?${params.toString()}`, signal)
}

export function searchSymbols(
  query: string,
  limit = 12,
  signal?: AbortSignal,
): Promise<ApiEnvelope<SearchResult[]>> {
  const params = new URLSearchParams({ q: query, limit: String(limit) })
  return apiFetch<SearchResult[]>(`/api/stocks/search?${params.toString()}`, signal)
}

export function fetchQuote(symbol: string, signal?: AbortSignal): Promise<ApiEnvelope<Quote>> {
  return apiFetch<Quote>(`/api/stocks/${encodeURIComponent(symbol)}/quote`, signal)
}

/**
 * Fetches quotes for any number of symbols, batching into provider-friendly
 * groups of eight (the server's max) and merging the results. Requests run
 * sequentially so a large watchlist does not burst the provider rate limit.
 */
export async function fetchQuotes(
  symbols: string[],
  signal?: AbortSignal,
): Promise<ApiEnvelope<BatchQuotes>> {
  const unique = uniqueSymbols(symbols)
  if (unique.length === 0) {
    return {
      data: { quotes: {}, missing: [] },
      meta: emptyMeta(),
    }
  }

  const quotes: Record<string, Quote> = {}
  const missing: string[] = []
  let meta: ApiMeta | null = null

  for (let index = 0; index < unique.length; index += MAX_BATCH_SYMBOLS) {
    const chunk = unique.slice(index, index + MAX_BATCH_SYMBOLS)
    const envelope = await fetchQuotesChunk(chunk, signal)
    Object.assign(quotes, envelope.data.quotes)
    missing.push(...envelope.data.missing)
    meta = envelope.meta
  }

  return { data: { quotes, missing }, meta: meta ?? emptyMeta() }
}

function emptyMeta(): ApiMeta {
  return {
    provider: 'unknown',
    cached: false,
    stale: false,
    fetchedAt: new Date().toISOString(),
    dataStatus: 'unknown',
    dataStatusNote: '',
  }
}

export function fetchHistory(
  symbol: string,
  range: string,
  signal?: AbortSignal,
): Promise<ApiEnvelope<HistoricalSeries>> {
  const params = new URLSearchParams({ range })
  return apiFetch<HistoricalSeries>(
    `/api/stocks/${encodeURIComponent(symbol)}/history?${params.toString()}`,
    signal,
  )
}

export function fetchProfile(
  symbol: string,
  signal?: AbortSignal,
): Promise<ApiEnvelope<CompanyProfile>> {
  return apiFetch<CompanyProfile>(
    `/api/stocks/${encodeURIComponent(symbol)}/profile`,
    signal,
  )
}

export function fetchFinancials(
  symbol: string,
  signal?: AbortSignal,
): Promise<ApiEnvelope<CompanyFinancials>> {
  return apiFetch<CompanyFinancials>(
    `/api/stocks/${encodeURIComponent(symbol)}/financials`,
    signal,
  )
}

export function fetchCompanyNews(
  symbol: string,
  page = 1,
  pageSize = 12,
  signal?: AbortSignal,
): Promise<ApiEnvelope<NewsFeed>> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  })
  return apiFetch<NewsFeed>(
    `/api/news?symbol=${encodeURIComponent(symbol)}&${params.toString()}`,
    signal,
  )
}

export function fetchMarketNews(
  category: string,
  page = 1,
  pageSize = 12,
  signal?: AbortSignal,
): Promise<ApiEnvelope<NewsFeed>> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (category) params.set('category', category)
  return apiFetch<NewsFeed>(`/api/news/market?${params.toString()}`, signal)
}

export function fetchHealth(signal?: AbortSignal): Promise<ProviderHealth> {
  return apiRequest<ProviderHealth>('/api/health', { signal })
}

export interface AuthUser {
  id: string
  email: string
  displayName: string | null
  createdAt: string
}

interface UserPayload {
  data: { user: AuthUser }
}

export async function fetchCurrentUser(signal?: AbortSignal): Promise<AuthUser> {
  const body = await apiRequest<UserPayload>('/api/auth/me', { signal })
  return body.data.user
}

export async function loginUser(
  email: string,
  password: string,
  signal?: AbortSignal,
): Promise<AuthUser> {
  const body = await apiRequest<UserPayload>('/api/auth/login', {
    method: 'POST',
    body: { email, password },
    signal,
  })
  return body.data.user
}

export async function registerUser(
  input: { email: string; password: string; displayName?: string },
  signal?: AbortSignal,
): Promise<AuthUser> {
  const body = await apiRequest<UserPayload>('/api/auth/register', {
    method: 'POST',
    body: input,
    signal,
  })
  return body.data.user
}

export async function logoutUser(signal?: AbortSignal): Promise<void> {
  await apiRequest<null>('/api/auth/logout', { method: 'POST', signal })
}

export interface WatchlistItem {
  id: string
  symbol: string
  name: string | null
  currency: string | null
  exchange: string | null
  addedAt: string
}

export interface WatchlistPayload {
  data: { items: WatchlistItem[]; count: number }
}

export function fetchWatchlist(signal?: AbortSignal): Promise<WatchlistPayload> {
  return apiRequest<WatchlistPayload>('/api/watchlist', { signal })
}

export interface AddWatchlistItemInput {
  symbol: string
  name?: string | null
  currency?: string | null
  exchange?: string | null
}

export interface AddWatchlistItemResult {
  data: { item: WatchlistItem; created: boolean }
}

export function addWatchlistItem(
  input: AddWatchlistItemInput,
  signal?: AbortSignal,
): Promise<AddWatchlistItemResult> {
  return apiRequest<AddWatchlistItemResult>('/api/watchlist/items', {
    method: 'POST',
    body: input,
    signal,
  })
}

export async function removeWatchlistItem(
  symbol: string,
  signal?: AbortSignal,
): Promise<void> {
  await apiRequest<null>(`/api/watchlist/items/${encodeURIComponent(symbol)}`, {
    method: 'DELETE',
    signal,
  })
}
