import { stocks } from '@/mocks/stocks'
import type { Stock } from '@/types'

export function getStockBySymbol(symbol: string): Stock | undefined {
  return stocks.find(
    (stock) => stock.symbol.toLowerCase() === symbol.toLowerCase(),
  )
}

export function searchStocks(query: string): Stock[] {
  const term = query.trim().toLowerCase()
  if (!term) return stocks
  return stocks.filter(
    (stock) =>
      stock.symbol.toLowerCase().includes(term) ||
      stock.name.toLowerCase().includes(term) ||
      stock.sector.toLowerCase().includes(term),
  )
}

export type StockSortKey =
  | 'name'
  | 'symbol'
  | 'price'
  | 'changePercent'
  | 'marketCap'

export type SortDirection = 'asc' | 'desc'

export function sortStocks(
  list: Stock[],
  key: StockSortKey,
  direction: SortDirection,
): Stock[] {
  const sorted = [...list].sort((a, b) => {
    switch (key) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'symbol':
        return a.symbol.localeCompare(b.symbol)
      case 'price':
        return a.price - b.price
      case 'marketCap':
        return a.marketCap - b.marketCap
      case 'changePercent':
      default:
        return a.changePercent - b.changePercent
    }
  })
  return direction === 'asc' ? sorted : sorted.reverse()
}

export function getTopGainers(count = 5): Stock[] {
  return [...stocks].sort((a, b) => b.changePercent - a.changePercent).slice(0, count)
}

export function getTopLosers(count = 5): Stock[] {
  return [...stocks].sort((a, b) => a.changePercent - b.changePercent).slice(0, count)
}

export function getStocksBySymbols(symbols: string[]): Stock[] {
  return symbols
    .map((symbol) => getStockBySymbol(symbol))
    .filter((stock): stock is Stock => Boolean(stock))
}
