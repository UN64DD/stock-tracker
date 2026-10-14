import {
  fetchCompanyNews,
  fetchFinancials,
  fetchHistory,
  fetchMarketNews,
  fetchProfile,
  fetchQuote,
  fetchQuotes,
  searchSymbols,
} from '@/lib/api'
import { useAsync } from '@/hooks/useAsync'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useNewsFeed, type NewsFeedState } from '@/hooks/useNewsFeed'

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

export function useFinancials(symbol: string | undefined) {
  return useAsync(
    (signal) => fetchFinancials(symbol ?? '', signal),
    [symbol],
    Boolean(symbol),
  )
}

export function useCompanyNews(
  symbol: string | undefined,
  pageSize = 9,
): NewsFeedState {
  return useNewsFeed(
    (page, signal) => fetchCompanyNews(symbol ?? '', page, pageSize, signal),
    [symbol, pageSize],
    Boolean(symbol),
  )
}

export function useMarketNews(
  category: string,
  pageSize = 9,
): NewsFeedState {
  return useNewsFeed(
    (page, signal) => fetchMarketNews(category, page, pageSize, signal),
    [category, pageSize],
  )
}
