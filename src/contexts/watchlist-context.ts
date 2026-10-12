import { createContext, useContext } from 'react'
import type { Stock } from '@/types'

export interface WatchlistContextValue {
  symbols: string[]
  stocks: Stock[]
  addToWatchlist: (symbol: string) => void
  removeFromWatchlist: (symbol: string) => void
  toggleWatchlist: (symbol: string) => void
  isInWatchlist: (symbol: string) => boolean
}

export const WatchlistContext = createContext<WatchlistContextValue | null>(null)

export function useWatchlist(): WatchlistContextValue {
  const context = useContext(WatchlistContext)
  if (!context) {
    throw new Error('useWatchlist must be used within a WatchlistProvider')
  }
  return context
}
