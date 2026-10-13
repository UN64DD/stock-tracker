import { ProviderError, UpstreamTimeoutError } from './errors.js'

export interface JsonResponse<T = unknown> {
  ok: boolean
  status: number
  data: T
}

interface RequestOptions {
  timeoutMs: number
  headers?: Record<string, string>
  signal?: AbortSignal
}

/**
 * Minimal fetch wrapper that enforces a timeout and parses JSON.
 * Provider-specific error interpretation lives in the provider module.
 */
export async function fetchJson<T = unknown>(
  url: string,
  { timeoutMs, headers, signal }: RequestOptions,
): Promise<JsonResponse<T>> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  const onExternalAbort = () => controller.abort()
  signal?.addEventListener('abort', onExternalAbort, { once: true })

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { accept: 'application/json', ...headers },
      signal: controller.signal,
    })

    const text = await response.text()
    let data: unknown = null
    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        throw new ProviderError('The provider returned a malformed response.', {
          status: 502,
        })
      }
    }

    return { ok: response.ok, status: response.status, data: data as T }
  } catch (error) {
    if (error instanceof ProviderError) throw error
    if (error instanceof Error && error.name === 'AbortError') {
      throw new UpstreamTimeoutError()
    }
    throw new ProviderError('Failed to reach the market data provider.', {
      status: 502,
      details: error instanceof Error ? error.message : undefined,
    })
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', onExternalAbort)
  }
}
