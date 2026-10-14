/* eslint-disable react-hooks/set-state-in-effect -- This provider mirrors async watchlist state into React state. */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  addWatchlistItem,
  fetchWatchlist,
  removeWatchlistItem,
  type AddWatchlistItemInput,
  type WatchlistItem,
} from '@/lib/api'
import { useAuth } from './auth-context'
import { WatchlistContext, type WatchlistContextValue } from './watchlist-context'

function sameSymbol(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase()
}

/**
 * Single source of truth for the signed-in user's watchlist. State is loaded
 * from the API and mutated there, then refetched, so the dashboard preview,
 * details page and watchlist page always agree.
 */
export function WatchlistProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [pendingSymbols, setPendingSymbols] = useState<string[]>([])
  const abortRef = useRef<AbortController | null>(null)

  const load = useCallback(async () => {
    if (!user) {
      setItems([])
      setError(null)
      setLoading(false)
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setError(null)

    try {
      const result = await fetchWatchlist(controller.signal)
      if (controller.signal.aborted) return
      setItems(result.data.items)
    } catch (loadError) {
      if (controller.signal.aborted) return
      setError(loadError)
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (authLoading) return
    void load()
    return () => {
      abortRef.current?.abort()
    }
  }, [authLoading, load])

  const markPending = useCallback((symbol: string, active: boolean) => {
    setPendingSymbols((previous) =>
      active
        ? previous.includes(symbol)
          ? previous
          : [...previous, symbol]
        : previous.filter((item) => item !== symbol),
    )
  }, [])

  const isInWatchlist = useCallback(
    (symbol: string) => items.some((item) => sameSymbol(item.symbol, symbol)),
    [items],
  )

  const addToWatchlist = useCallback(
    async (input: AddWatchlistItemInput) => {
      if (!user) throw new Error('You must be signed in to edit your watchlist.')
      const symbol = input.symbol.toUpperCase()
      markPending(symbol, true)
      try {
        await addWatchlistItem({ ...input, symbol })
        await load()
      } finally {
        markPending(symbol, false)
      }
    },
    [user, load, markPending],
  )

  const removeFromWatchlist = useCallback(
    async (symbol: string) => {
      if (!user) throw new Error('You must be signed in to edit your watchlist.')
      const normalized = symbol.toUpperCase()
      markPending(normalized, true)
      try {
        await removeWatchlistItem(normalized)
        await load()
      } finally {
        markPending(normalized, false)
      }
    },
    [user, load, markPending],
  )

  const toggleWatchlist = useCallback(
    async (input: AddWatchlistItemInput) => {
      if (isInWatchlist(input.symbol)) {
        await removeFromWatchlist(input.symbol)
      } else {
        await addToWatchlist(input)
      }
    },
    [isInWatchlist, addToWatchlist, removeFromWatchlist],
  )

  const symbols = useMemo(() => items.map((item) => item.symbol), [items])

  const value = useMemo<WatchlistContextValue>(
    () => ({
      items,
      symbols,
      count: items.length,
      loading,
      error,
      isAuthenticated: Boolean(user),
      pendingSymbols,
      isInWatchlist,
      addToWatchlist,
      removeFromWatchlist,
      toggleWatchlist,
      refresh: load,
    }),
    [
      items,
      symbols,
      loading,
      error,
      user,
      pendingSymbols,
      isInWatchlist,
      addToWatchlist,
      removeFromWatchlist,
      toggleWatchlist,
      load,
    ],
  )

  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>
}
