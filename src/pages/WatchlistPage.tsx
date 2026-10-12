import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChartLine, Star, Trash } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DemoBadge } from '@/components/common/DemoBadge'
import { SearchInput } from '@/components/common/SearchInput'
import { StockTable } from '@/components/common/StockTable'
import { EmptyState } from '@/components/common/EmptyState'
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog'
import { Card } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button-variants'
import { useWatchlist } from '@/contexts/watchlist-context'
import { useToast } from '@/contexts/toast-context'
import { cn } from '@/lib/utils'

export function WatchlistPage() {
  const { stocks, removeFromWatchlist } = useWatchlist()
  const { toast } = useToast()
  const [query, setQuery] = useState('')
  const [pendingSymbol, setPendingSymbol] = useState<string | null>(null)

  const results = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return stocks
    return stocks.filter(
      (stock) =>
        stock.symbol.toLowerCase().includes(term) ||
        stock.name.toLowerCase().includes(term),
    )
  }, [stocks, query])

  const gainers = stocks.filter((stock) => stock.changePercent > 0).length
  const losers = stocks.filter((stock) => stock.changePercent < 0).length

  const confirmRemove = () => {
    if (!pendingSymbol) return
    removeFromWatchlist(pendingSymbol)
    toast({
      title: `${pendingSymbol} removed`,
      description: 'Updated in this browser’s demo storage.',
      variant: 'default',
    })
    setPendingSymbol(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Watchlist"
        description="Saved mock symbols. Stored in this browser via localStorage — not real multi-user persistence."
        badge={<DemoBadge label={`${stocks.length} saved`} />}
        actions={
          <Link to="/stocks" className={cn(buttonVariants())}>
            Add stocks
          </Link>
        }
      />

      {stocks.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="p-4">
            <p className="text-xs font-medium text-muted-foreground">
              Tracked symbols
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
              {stocks.length}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium text-muted-foreground">
              Gaining today
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {gainers}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium text-muted-foreground">
              Declining today
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-red-600 dark:text-red-400">
              {losers}
            </p>
          </Card>
        </div>
      ) : null}

      {stocks.length === 0 ? (
        <EmptyState
          icon={Star}
          title="Your watchlist is empty"
          description="Add symbols from any stock details page to track them here. Changes persist in this browser only."
          action={
            <Link to="/stocks" className={cn(buttonVariants())}>
              Explore stocks
            </Link>
          }
        />
      ) : (
        <>
          <Card className="p-4">
            <SearchInput
              value={query}
              onValueChange={setQuery}
              placeholder="Search your watchlist…"
              aria-label="Search watchlist"
            />
          </Card>

          {results.length === 0 ? (
            <EmptyState
              icon={ChartLine}
              title="No matching saved stocks"
              description={`None of your saved symbols match “${query}”.`}
            />
          ) : (
            <Card className="overflow-hidden">
              <StockTable stocks={results} onRemove={setPendingSymbol} />
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
        description={`${pendingSymbol ?? 'This symbol'} will be removed from your saved watchlist in this browser.`}
        confirmLabel="Remove"
        destructive
        onConfirm={confirmRemove}
      />

      {stocks.length > 0 ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Trash className="size-3.5" aria-hidden="true" />
          Removing a symbol is confirmed first to avoid accidental deletion.
        </p>
      ) : null}
    </div>
  )
}
