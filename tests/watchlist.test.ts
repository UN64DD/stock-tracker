import { describe, expect, it } from 'vitest'
import type { Quote, WatchlistItem } from '@/lib/api'
import {
  formatQuoteFreshness,
  mergeWatchlist,
  sortWatchlistRows,
  type WatchlistRow,
} from '@/lib/watchlist'

function makeQuote(overrides: Partial<Quote> & { symbol: string }): Quote {
  return {
    name: null,
    exchange: null,
    currency: 'USD',
    price: 100,
    change: 0,
    changePercent: 0,
    previousClose: 100,
    open: null,
    high: null,
    low: null,
    volume: null,
    averageVolume: null,
    high52Week: null,
    low52Week: null,
    isMarketOpen: null,
    timestamp: 1_700_000_000_000,
    dataStatus: 'real-time',
    ...overrides,
  }
}

function makeItem(
  overrides: Partial<WatchlistItem> & { symbol: string },
): WatchlistItem {
  return {
    id: overrides.symbol,
    name: null,
    currency: null,
    exchange: null,
    addedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('mergeWatchlist', () => {
  it('joins items with matching quotes', () => {
    const rows = mergeWatchlist(
      [makeItem({ symbol: 'AAPL', name: 'Apple Inc.' })],
      { AAPL: makeQuote({ symbol: 'AAPL', name: 'Apple Inc.', price: 190 }) },
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].quote?.price).toBe(190)
    expect(rows[0].name).toBe('Apple Inc.')
  })

  it('keeps items without a quote instead of dropping them', () => {
    const rows = mergeWatchlist(
      [makeItem({ symbol: 'MISSING' })],
      {},
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].quote).toBeNull()
    expect(rows[0].name).toBe('MISSING')
  })

  it('keeps the stored name but uses the quote currency for pricing', () => {
    const rows = mergeWatchlist(
      [makeItem({ symbol: 'TSLA', name: 'Stored', currency: 'USD' })],
      { TSLA: makeQuote({ symbol: 'TSLA', name: 'Tesla, Inc.', currency: 'EUR' }) },
    )
    expect(rows[0].name).toBe('Stored')
    expect(rows[0].currency).toBe('EUR')
  })

  it('preserves persisted metadata when no quote is available', () => {
    const rows = mergeWatchlist(
      [makeItem({ symbol: 'NVDA', name: 'NVIDIA', currency: 'USD', exchange: 'NASDAQ' })],
      {},
    )
    expect(rows[0].currency).toBe('USD')
    expect(rows[0].exchange).toBe('NASDAQ')
  })
})

function rowsForSort(): WatchlistRow[] {
  return mergeWatchlist(
    [
      makeItem({ symbol: 'MSFT', name: 'Microsoft' }),
      makeItem({ symbol: 'AAPL', name: 'Apple' }),
      makeItem({ symbol: 'ZZZZ', name: 'No Quote Co.' }),
      makeItem({ symbol: 'GOOGL', name: 'Alphabet' }),
    ],
    {
      AAPL: makeQuote({ symbol: 'AAPL', price: 190, changePercent: 2 }),
      MSFT: makeQuote({ symbol: 'MSFT', price: 400, changePercent: -1 }),
      GOOGL: makeQuote({ symbol: 'GOOGL', price: 150, changePercent: 0.5 }),
    },
  )
}

describe('sortWatchlistRows', () => {
  it('sorts alphabetically by symbol ascending', () => {
    const sorted = sortWatchlistRows(rowsForSort(), 'symbol', 'asc')
    expect(sorted.map((row) => row.symbol)).toEqual([
      'AAPL',
      'GOOGL',
      'MSFT',
      'ZZZZ',
    ])
  })

  it('sorts by name descending', () => {
    const sorted = sortWatchlistRows(rowsForSort(), 'name', 'desc')
    expect(sorted.map((row) => row.name)).toEqual([
      'No Quote Co.',
      'Microsoft',
      'Apple',
      'Alphabet',
    ])
  })

  it('sorts by price and always pushes missing quotes last (asc)', () => {
    const sorted = sortWatchlistRows(rowsForSort(), 'price', 'asc')
    expect(sorted.map((row) => row.symbol)).toEqual([
      'GOOGL',
      'AAPL',
      'MSFT',
      'ZZZZ',
    ])
  })

  it('sorts by changePercent descending with missing quotes still last', () => {
    const sorted = sortWatchlistRows(rowsForSort(), 'changePercent', 'desc')
    expect(sorted.map((row) => row.symbol)).toEqual([
      'AAPL',
      'GOOGL',
      'MSFT',
      'ZZZZ',
    ])
  })

  it('does not mutate the input array', () => {
    const rows = rowsForSort()
    const before = rows.map((row) => row.symbol)
    sortWatchlistRows(rows, 'price', 'desc')
    expect(rows.map((row) => row.symbol)).toEqual(before)
  })

  it('breaks numeric ties by symbol', () => {
    const rows = mergeWatchlist(
      [
        makeItem({ symbol: 'BBB' }),
        makeItem({ symbol: 'AAA' }),
      ],
      {
        BBB: makeQuote({ symbol: 'BBB', price: 50 }),
        AAA: makeQuote({ symbol: 'AAA', price: 50 }),
      },
    )
    const sorted = sortWatchlistRows(rows, 'price', 'asc')
    expect(sorted.map((row) => row.symbol)).toEqual(['AAA', 'BBB'])
  })
})

describe('formatQuoteFreshness', () => {
  it('labels a missing timestamp as unavailable', () => {
    expect(formatQuoteFreshness(null)).toBe('Unavailable')
    expect(formatQuoteFreshness(Number.NaN)).toBe('Unavailable')
  })

  it('formats a valid timestamp', () => {
    const label = formatQuoteFreshness(1_700_000_000_000)
    expect(label).not.toBe('Unavailable')
    expect(label.length).toBeGreaterThan(0)
  })
})
