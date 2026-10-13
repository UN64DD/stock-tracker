import { useMemo, useState } from 'react'
import { ChartLine, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { LiveBadge } from '@/components/common/LiveBadge'
import { SearchInput } from '@/components/common/SearchInput'
import { StockTable } from '@/components/common/StockTable'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingState } from '@/components/common/LoadingState'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { isApiError, type Quote } from '@/lib/api'
import { toStockView } from '@/lib/liveStock'
import { sortStocks, type SortDirection, type StockSortKey } from '@/lib/stocks'
import { useQuotes, useSymbolSearch } from '@/hooks/useMarketData'

const POPULAR_SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'TSLA']
const SEARCH_LIMIT = 12
const QUOTE_LIMIT = 6

function describeError(error: unknown): string {
  if (isApiError(error)) {
    if (error.code === 'provider_rate_limited') {
      return 'The free market data tier rate limit was reached. Wait a minute and try again.'
    }
    if (error.code === 'network_error') {
      return 'The market data API server could not be reached. Start it with "npm run dev:server".'
    }
    return error.message
  }
  return 'Something went wrong while loading live quotes.'
}

export function ExploreStocksPage() {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<StockSortKey>('changePercent')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const isSearching = query.trim().length > 0
  const search = useSymbolSearch(query, SEARCH_LIMIT)

  const symbols = useMemo(() => {
    if (!isSearching) return POPULAR_SYMBOLS
    return (search.data ?? []).slice(0, QUOTE_LIMIT).map((item) => item.symbol)
  }, [isSearching, search.data])

  const quotesState = useQuotes(symbols)

  const stocks = useMemo(() => {
    const quotes = quotesState.data?.quotes ?? {}
    return symbols
      .map((symbol) => quotes[symbol])
      .filter((quote): quote is Quote => Boolean(quote))
      .map((quote) => toStockView(quote))
  }, [symbols, quotesState.data])

  const sorted = useMemo(
    () => sortStocks(stocks, sortKey, sortDirection),
    [stocks, sortKey, sortDirection],
  )

  const loading = isSearching
    ? search.loading || quotesState.loading
    : quotesState.loading
  const error = isSearching
    ? (search.error ?? quotesState.error)
    : quotesState.error
  const meta = quotesState.meta ?? search.meta

  const handleSortChange = (key: StockSortKey) => {
    if (key === sortKey) {
      setSortDirection((previous) => (previous === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDirection(key === 'name' || key === 'symbol' ? 'asc' : 'desc')
    }
  }

  const handleRefresh = () => {
    search.reload()
    quotesState.reload()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Explore Stocks"
        description="Search live symbols and view real-time quotes. Popular symbols are shown until you search."
        badge={meta ? <LiveBadge status={meta.dataStatus} cached={meta.cached} stale={meta.stale} /> : null}
      />

      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <SearchInput
              value={query}
              onValueChange={setQuery}
              placeholder="Search any symbol or company (e.g. AAPL, Tesla)…"
              aria-label="Search stocks"
            />
          </div>
          <div>
            <label htmlFor="sort-key" className="sr-only">
              Sort stocks
            </label>
            <Select
              id="sort-key"
              value={sortKey}
              onChange={(event) =>
                handleSortChange(event.target.value as StockSortKey)
              }
            >
              <option value="changePercent">Sort by % change</option>
              <option value="price">Sort by price</option>
              <option value="name">Sort by company</option>
              <option value="symbol">Sort by symbol</option>
            </Select>
          </div>
          <div className="flex items-center">
            <Button
              type="button"
              variant="outline"
              onClick={handleRefresh}
              className="w-full"
            >
              <RefreshCw aria-hidden="true" />
              Refresh
            </Button>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {isSearching
            ? `Showing top ${QUOTE_LIMIT} live matches for “${query.trim()}”`
            : `Showing ${POPULAR_SYMBOLS.length} popular symbols`}{' '}
          · {sorted.length} loaded ·
          sorted {sortDirection === 'asc' ? 'ascending' : 'descending'}
        </p>
      </Card>

      {error ? (
        <ErrorState
          title="Could not load live market data"
          description={describeError(error)}
          action={
            <Button type="button" variant="outline" onClick={handleRefresh}>
              <RefreshCw aria-hidden="true" />
              Try again
            </Button>
          }
        />
      ) : loading && sorted.length === 0 ? (
        <LoadingState variant="rows" label="Loading live quotes…" />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={ChartLine}
          title="No stocks match your search"
          description="Try a different ticker or company name. Market data covers US-listed equities and ETFs."
        />
      ) : (
        <Card className="overflow-hidden">
          <StockTable
            stocks={sorted}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
          />
        </Card>
      )}
    </div>
  )
}
