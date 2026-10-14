import { createContext, useContext } from 'react'
import type { AddWatchlistItemInput, WatchlistItem } from '@/lib/api'

export interface WatchlistContextValue {
  /** Server-persisted items for the signed-in user (empty when signed out). */
  items: WatchlistItem[]
  symbols: string[]
  count: number
  loading: boolean
  error: unknown
  isAuthenticated: boolean
  /** Symbols with an in-flight add/remove request. */
  pendingSymbols: string[]
  isInWatchlist: (symbol: string) => boolean
  /** Rejects with an `ApiError` on failure so callers can surface a message. */
  addToWatchlist: (input: AddWatchlistItemInput) => Promise<void>
  removeFromWatchlist: (symbol: string) => Promise<void>
  toggleWatchlist: (input: AddWatchlistItemInput) => Promise<void>
  refresh: () => Promise<void>
}

export const WatchlistContext = createContext<WatchlistContextValue | null>(null)

export function useWatchlist(): WatchlistContextValue {
  const context = useContext(WatchlistContext)
  if (!context) {
    throw new Error('useWatchlist must be used within a WatchlistProvider')
  }
  return context
}
