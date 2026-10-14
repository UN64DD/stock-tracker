import { Link } from 'react-router-dom'
import { ArrowUpDown, Eye, LoaderCircle, Trash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/format'
import {
  UNAVAILABLE,
  accentForSymbol,
  formatDataStatus,
} from '@/lib/liveStock'
import {
  formatQuoteFreshness,
  type SortDirection,
  type WatchlistRow,
  type WatchlistSortKey,
} from '@/lib/watchlist'
import { cn } from '@/lib/utils'
import { PriceChange } from './PriceChange'
import { SymbolBadge } from './StockRow'

interface WatchlistTableProps {
  rows: WatchlistRow[]
  sortKey: WatchlistSortKey
  sortDirection: SortDirection
  onSortChange: (key: WatchlistSortKey) => void
  onRemove: (symbol: string) => void
  removingSymbols: string[]
  className?: string
}

interface SortableHeadProps {
  label: string
  sortKey: WatchlistSortKey
  activeKey: WatchlistSortKey
  direction: SortDirection
  onSortChange: (key: WatchlistSortKey) => void
  className?: string
}

function SortableHead({
  label,
  sortKey,
  activeKey,
  direction,
  onSortChange,
  className,
}: SortableHeadProps) {
  const isActive = activeKey === sortKey
  const ariaSort = isActive
    ? direction === 'asc'
      ? 'ascending'
      : 'descending'
    : 'none'

  return (
    <TableHead className={className} aria-sort={ariaSort}>
      <button
        type="button"
        onClick={() => onSortChange(sortKey)}
        className={cn(
          'inline-flex items-center gap-1 rounded transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isActive ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {label}
        <ArrowUpDown className="size-3" aria-hidden="true" />
      </button>
    </TableHead>
  )
}

export function WatchlistTable({
  rows,
  sortKey,
  sortDirection,
  onSortChange,
  onRemove,
  removingSymbols,
  className,
}: WatchlistTableProps) {
  return (
    <Table className={className}>
      <TableHeader>
        <TableRow>
          <SortableHead
            label="Symbol"
            sortKey="symbol"
            activeKey={sortKey}
            direction={sortDirection}
            onSortChange={onSortChange}
          />
          <SortableHead
            label="Company"
            sortKey="name"
            activeKey={sortKey}
            direction={sortDirection}
            onSortChange={onSortChange}
            className="hidden md:table-cell"
          />
          <SortableHead
            label="Price"
            sortKey="price"
            activeKey={sortKey}
            direction={sortDirection}
            onSortChange={onSortChange}
            className="text-right"
          />
          <SortableHead
            label="Day change"
            sortKey="changePercent"
            activeKey={sortKey}
            direction={sortDirection}
            onSortChange={onSortChange}
            className="text-right"
          />
          <TableHead className="hidden text-right lg:table-cell">Updated</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const { quote } = row
          const removing = removingSymbols.includes(row.symbol)
          return (
            <TableRow key={row.symbol}>
              <TableCell>
                <Link
                  to={`/stocks/${row.symbol}`}
                  className="flex items-center gap-3 focus-visible:outline-none"
                >
                  <SymbolBadge symbol={row.symbol} accent={accentForSymbol(row.symbol)} />
                  <span className="font-semibold text-foreground">{row.symbol}</span>
                </Link>
              </TableCell>
              <TableCell className="hidden max-w-56 truncate text-muted-foreground md:table-cell">
                {row.name}
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums text-foreground">
                {quote ? formatCurrency(quote.price, quote.currency ?? undefined) : UNAVAILABLE}
                {quote?.currency ? (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    {quote.currency}
                  </span>
                ) : null}
              </TableCell>
              <TableCell className="text-right">
                {quote && quote.change !== null && quote.changePercent !== null ? (
                  <PriceChange
                    change={quote.change}
                    changePercent={quote.changePercent}
                    currency={quote.currency ?? undefined}
                    showIcon={false}
                    className="justify-end"
                  />
                ) : (
                  <span className="text-muted-foreground">{UNAVAILABLE}</span>
                )}
              </TableCell>
              <TableCell className="hidden text-right text-xs text-muted-foreground lg:table-cell">
                {quote ? (
                  <span title={formatQuoteFreshness(quote.timestamp)}>
                    {formatDataStatus(quote.dataStatus)}
                    <span className="block">{formatQuoteFreshness(quote.timestamp)}</span>
                  </span>
                ) : (
                  UNAVAILABLE
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  <Link
                    to={`/stocks/${row.symbol}`}
                    aria-label={`View ${row.symbol} details`}
                    className={cn(
                      buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
                      'text-muted-foreground',
                    )}
                  >
                    <Eye aria-hidden="true" />
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${row.symbol} from watchlist`}
                    onClick={() => onRemove(row.symbol)}
                    disabled={removing}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    {removing ? (
                      <LoaderCircle className="animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash aria-hidden="true" />
                    )}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
