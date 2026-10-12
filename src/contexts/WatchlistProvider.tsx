import { useMemo, type ReactNode } from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { getStocksBySymbols } from '@/lib/stocks'
import { STORAGE_KEYS } from '@/lib/storage'
import {
  WatchlistContext,
  type WatchlistContextValue,
} from './watchlist-context'

const defaultWatchlist = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'TSLA']

function sameSymbol(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase()
}

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [symbols, setSymbols] = useLocalStorage<string[]>(
    STORAGE_KEYS.watchlist,
    defaultWatchlist,
  )

  const value = useMemo<WatchlistContextValue>(
    () => ({
      symbols,
      stocks: getStocksBySymbols(symbols),
      addToWatchlist: (symbol) =>
        setSymbols((previous) =>
          previous.some((item) => sameSymbol(item, symbol))
            ? previous
            : [...previous, symbol],
        ),
      removeFromWatchlist: (symbol) =>
        setSymbols((previous) =>
          previous.filter((item) => !sameSymbol(item, symbol)),
        ),
      toggleWatchlist: (symbol) =>
        setSymbols((previous) =>
          previous.some((item) => sameSymbol(item, symbol))
            ? previous.filter((item) => !sameSymbol(item, symbol))
            : [...previous, symbol],
        ),
      isInWatchlist: (symbol) =>
        symbols.some((item) => sameSymbol(item, symbol)),
    }),
    [symbols, setSymbols],
  )

  return (
    <WatchlistContext.Provider value={value}>
      {children}
    </WatchlistContext.Provider>
  )
}
