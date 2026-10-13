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

async function apiRequest<T>(
  path: string,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      signal,
      headers: { Accept: 'application/json' },
    })
  } catch (error) {
    if (isAbortError(error)) throw error
    throw new ApiError(
      0,
      'network_error',
      'Could not reach the market data service. Make sure the API server is running.',
    )
  }

  const body = (await response.json().catch(() => null)) as
    | { error?: { code?: string; message?: string; details?: unknown } }
    | T
    | null

  if (!response.ok) {
    const errorBody = body as
      | { error?: { code?: string; message?: string; details?: unknown } }
      | null
    throw new ApiError(
      response.status,
      errorBody?.error?.code ?? 'request_failed',
      errorBody?.error?.message ?? `Request failed with status ${response.status}.`,
      errorBody?.error?.details,
    )
  }

  return body as T
}

async function apiFetch<T>(path: string, signal?: AbortSignal): Promise<ApiEnvelope<T>> {
  return apiRequest<ApiEnvelope<T>>(path, signal)
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

export function fetchQuotes(
  symbols: string[],
  signal?: AbortSignal,
): Promise<ApiEnvelope<BatchQuotes>> {
  const params = new URLSearchParams({ symbols: symbols.join(',') })
  return apiFetch<BatchQuotes>(`/api/stocks/quotes?${params.toString()}`, signal)
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

export function fetchHealth(signal?: AbortSignal): Promise<ProviderHealth> {
  return apiRequest<ProviderHealth>('/api/health', signal)
}
