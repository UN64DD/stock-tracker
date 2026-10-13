/* eslint-disable react-hooks/set-state-in-effect -- This hook intentionally mirrors async fetch state into React state. */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ApiEnvelope, ApiMeta } from '@/lib/api'

export interface AsyncState<T> {
  data: T | null
  error: unknown
  loading: boolean
  meta: ApiMeta | null
  reload: () => void
}

/**
 * Runs an async envelope-returning task whenever `deps` change, aborting the
 * previous request. Pass `enabled: false` to skip execution entirely.
 */
export function useAsync<T>(
  factory: (signal: AbortSignal) => Promise<ApiEnvelope<T>>,
  deps: readonly unknown[],
  enabled = true,
): AsyncState<T> {
  const factoryRef = useRef(factory)

  useEffect(() => {
    factoryRef.current = factory
  })

  const [state, setState] = useState<{
    data: T | null
    error: unknown
    loading: boolean
    meta: ApiMeta | null
  }>({ data: null, error: null, loading: enabled, meta: null })
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    if (!enabled) {
      setState({ data: null, error: null, loading: false, meta: null })
      return
    }

    const controller = new AbortController()
    let active = true
    setState((previous) => ({ ...previous, loading: true, error: null }))

    factoryRef.current(controller.signal)
      .then((envelope) => {
        if (!active) return
        setState({ data: envelope.data, error: null, loading: false, meta: envelope.meta })
      })
      .catch((error: unknown) => {
        if (!active || controller.signal.aborted) return
        setState({ data: null, error, loading: false, meta: null })
      })

    return () => {
      active = false
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, reloadToken])

  const reload = useCallback(() => setReloadToken((token) => token + 1), [])

  return { ...state, reload }
}
