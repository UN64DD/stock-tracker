import type { Quote, WatchlistItem } from '@/lib/api'

export type WatchlistSortKey = 'symbol' | 'name' | 'price' | 'changePercent'

export type SortDirection = 'asc' | 'desc'

/** A saved watchlist item joined with its latest quote (if one is available). */
export interface WatchlistRow {
  symbol: string
  name: string
  currency: string | null
  exchange: string | null
  addedAt: string
  quote: Quote | null
}

/**
 * Joins persisted watchlist items with a symbol→quote map. Items without a
 * quote are kept (with `quote: null`) so the UI can mark them unavailable
 * rather than dropping them or inventing a price.
 */
export function mergeWatchlist(
  items: WatchlistItem[],
  quotes: Record<string, Quote | undefined>,
): WatchlistRow[] {
  return items.map((item) => {
    const quote = quotes[item.symbol] ?? null
    return {
      symbol: item.symbol,
      name: item.name ?? quote?.name ?? item.symbol,
      currency: quote?.currency ?? item.currency ?? null,
      exchange: quote?.exchange ?? item.exchange ?? null,
      addedAt: item.addedAt,
      quote,
    }
  })
}

/** Human-readable freshness label for a quote timestamp (Unix milliseconds). */
export function formatQuoteFreshness(timestamp: number | null): string {
  if (timestamp === null || !Number.isFinite(timestamp)) return 'Unavailable'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

function numericValue(row: WatchlistRow, key: WatchlistSortKey): number | null {
  if (!row.quote) return null
  return key === 'price' ? row.quote.price : row.quote.changePercent
}

/**
 * Sorts rows by the given key. Symbol/name sort lexically; price and change
 * sort numerically, with rows that have no quote always pushed to the end so
 * missing data never masquerades as a value.
 */
export function sortWatchlistRows(
  rows: WatchlistRow[],
  key: WatchlistSortKey,
  direction: SortDirection,
): WatchlistRow[] {
  const factor = direction === 'asc' ? 1 : -1

  return [...rows].sort((a, b) => {
    if (key === 'symbol' || key === 'name') {
      const av = key === 'symbol' ? a.symbol : a.name
      const bv = key === 'symbol' ? b.symbol : b.name
      return av.localeCompare(bv) * factor
    }

    const an = numericValue(a, key)
    const bn = numericValue(b, key)
    if (an === null && bn === null) return a.symbol.localeCompare(b.symbol)
    if (an === null) return 1
    if (bn === null) return -1
    if (an === bn) return a.symbol.localeCompare(b.symbol)
    return (an - bn) * factor
  })
}
