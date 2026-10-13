import {
  fetchHistory,
  fetchProfile,
  fetchQuote,
  fetchQuotes,
  searchSymbols,
} from '@/lib/api'
import { useAsync } from '@/hooks/useAsync'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

export function useSymbolSearch(query: string, limit = 12) {
  const debounced = useDebouncedValue(query.trim(), 400)
  return useAsync(
    (signal) => searchSymbols(debounced, limit, signal),
    [debounced, limit],
    debounced.length > 0,
  )
}

export function useQuote(symbol: string | undefined) {
  return useAsync(
    (signal) => fetchQuote(symbol ?? '', signal),
    [symbol],
    Boolean(symbol),
  )
}

export function useQuotes(symbols: string[]) {
  const key = symbols.join(',')
  return useAsync(
    (signal) => fetchQuotes(symbols, signal),
    [key],
    symbols.length > 0,
  )
}

export function useHistory(symbol: string | undefined, range: string) {
  return useAsync(
    (signal) => fetchHistory(symbol ?? '', range, signal),
    [symbol, range],
    Boolean(symbol),
  )
}

export function useProfile(symbol: string | undefined) {
  return useAsync(
    (signal) => fetchProfile(symbol ?? '', signal),
    [symbol],
    Boolean(symbol),
  )
}
