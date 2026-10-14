import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChartLine, RefreshCw, Star, Trash } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DemoBadge } from '@/components/common/DemoBadge'
import { SearchInput } from '@/components/common/SearchInput'
import { WatchlistTable } from '@/components/common/WatchlistTable'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { useWatchlist } from '@/contexts/watchlist-context'
import { useToast } from '@/contexts/toast-context'
import { useQuotes } from '@/hooks/useMarketData'
import { isApiError } from '@/lib/api'
import {
  mergeWatchlist,
  sortWatchlistRows,
  type SortDirection,
  type WatchlistSortKey,
} from '@/lib/watchlist'
import { cn } from '@/lib/utils'

function messageFor(error: unknown): string {
  if (isApiError(error)) return error.message
  if (error instanceof Error) return error.message
  return 'Please try again.'
}

export function WatchlistPage() {
  const { items, symbols, count, loading, error, removeFromWatchlist, refresh, pendingSymbols } =
    useWatchlist()
  const { toast } = useToast()
  const quotesState = useQuotes(symbols)

  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<WatchlistSortKey>('symbol')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [pendingSymbol, setPendingSymbol] = useState<string | null>(null)

  const rows = useMemo(
    () => mergeWatchlist(items, quotesState.data?.quotes ?? {}),
    [items, quotesState.data],
  )

  const filteredRows = useMemo(() => {
    const term = query.trim().toLowerCase()
    const matching = term
      ? rows.filter(
          (row) =>
            row.symbol.toLowerCase().includes(term) ||
            row.name.toLowerCase().includes(term),
        )
      : rows
    return sortWatchlistRows(matching, sortKey, sortDirection)
  }, [rows, query, sortKey, sortDirection])

  const gainers = rows.filter((row) => (row.quote?.changePercent ?? 0) > 0).length
  const losers = rows.filter((row) => (row.quote?.changePercent ?? 0) < 0).length
  const unavailable = rows.filter((row) => !row.quote).length

  const handleSortChange = (key: WatchlistSortKey) => {
    if (key === sortKey) {
      setSortDirection((previous) => (previous === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDirection(key === 'symbol' || key === 'name' ? 'asc' : 'desc')
  }

  const handleRefresh = () => {
    void refresh()
    quotesState.reload()
  }

  const confirmRemove = async () => {
    if (!pendingSymbol) return
    const symbol = pendingSymbol
    setPendingSymbol(null)
    try {
      await removeFromWatchlist(symbol)
      toast({ title: `${symbol} removed`, description: 'Removed from your saved watchlist.' })
    } catch (removeError) {
      toast({
        title: `Could not remove ${symbol}`,
        description: messageFor(removeError),
        variant: 'error',
      })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Watchlist"
        description="Saved to your account server-side — available on any device you sign in from."
        badge={<DemoBadge label={`${count} saved`} />}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={cn(loading && 'animate-spin')} aria-hidden="true" />
              Refresh
            </Button>
            <Link to="/stocks" className={cn(buttonVariants())}>
              Add stocks
            </Link>
          </div>
        }
      />

      {error && items.length === 0 ? (
        <EmptyState
          title="Could not load your watchlist"
          description={messageFor(error)}
          action={
            <Button onClick={() => void refresh()}>Try again</Button>
          }
        />
      ) : loading && items.length === 0 ? (
        <LoadingState variant="rows" label="Loading your watchlist…" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Star}
          title="Your watchlist is empty"
          description="Add symbols from Explore Stocks or any stock details page to track them here."
          action={
            <Link to="/stocks" className={cn(buttonVariants())}>
              Explore stocks
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <Card className="p-4">
              <p className="text-xs font-medium text-muted-foreground">Tracked symbols</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{count}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-medium text-muted-foreground">Gaining today</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                {gainers}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-medium text-muted-foreground">Declining today</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-red-600 dark:text-red-400">
                {losers}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-medium text-muted-foreground">Quotes unavailable</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-muted-foreground">
                {unavailable}
              </p>
            </Card>
          </div>

          {quotesState.error ? (
            <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
              Live quotes could not be loaded. Saved symbols are shown without prices.
            </p>
          ) : null}

          <Card className="p-4">
            <SearchInput
              value={query}
              onValueChange={setQuery}
              placeholder="Search your watchlist…"
              aria-label="Search watchlist"
            />
          </Card>

          {filteredRows.length === 0 ? (
            <EmptyState
              icon={ChartLine}
              title="No matching saved stocks"
              description={`None of your saved symbols match “${query}”.`}
            />
          ) : (
            <Card className="overflow-hidden">
              <WatchlistTable
                rows={filteredRows}
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSortChange={handleSortChange}
                onRemove={setPendingSymbol}
                removingSymbols={pendingSymbols}
              />
            </Card>
          )}
        </>
      )}

      <ConfirmationDialog
        open={Boolean(pendingSymbol)}
        onOpenChange={(open) => {
          if (!open) setPendingSymbol(null)
        }}
        title="Remove from watchlist?"
        description={`${pendingSymbol ?? 'This symbol'} will be removed from your saved watchlist.`}
        confirmLabel="Remove"
        destructive
        onConfirm={() => void confirmRemove()}
      />

      {items.length > 0 ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Trash className="size-3.5" aria-hidden="true" />
          Removing a symbol is confirmed first to avoid accidental deletion.
        </p>
      ) : null}
    </div>
  )
}
