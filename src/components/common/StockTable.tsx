import { Link } from 'react-router-dom'
import { ArrowUpDown, Eye, Trash } from 'lucide-react'
import type { Stock } from '@/types'
import { cn } from '@/lib/utils'
import { formatCurrency, formatMarketCap } from '@/lib/format'
import type { SortDirection, StockSortKey } from '@/lib/stocks'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { PriceChange } from './PriceChange'
import { SymbolBadge } from './StockRow'
import { WatchlistButton } from './WatchlistButton'

interface StockTableProps {
  stocks: Stock[]
  sortKey?: StockSortKey
  sortDirection?: SortDirection
  onSortChange?: (key: StockSortKey) => void
  onRemove?: (symbol: string) => void
  className?: string
}

interface SortableHeadProps {
  label: string
  sortKey: StockSortKey
  activeKey?: StockSortKey
  direction?: SortDirection
  onSortChange?: (key: StockSortKey) => void
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
      {onSortChange ? (
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
      ) : (
        label
      )}
    </TableHead>
  )
}

export function StockTable({
  stocks,
  sortKey,
  sortDirection,
  onSortChange,
  onRemove,
  className,
}: StockTableProps) {
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
            label="Change"
            sortKey="changePercent"
            activeKey={sortKey}
            direction={sortDirection}
            onSortChange={onSortChange}
            className="text-right"
          />
          <SortableHead
            label="Market Cap"
            sortKey="marketCap"
            activeKey={sortKey}
            direction={sortDirection}
            onSortChange={onSortChange}
            className="hidden text-right lg:table-cell"
          />
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {stocks.map((stock) => (
          <TableRow key={stock.symbol}>
            <TableCell>
              <Link
                to={`/stocks/${stock.symbol}`}
                className="flex items-center gap-3 focus-visible:outline-none"
              >
                <SymbolBadge symbol={stock.symbol} accent={stock.accent} />
                <span className="font-semibold text-foreground">
                  {stock.symbol}
                </span>
              </Link>
            </TableCell>
            <TableCell className="hidden max-w-56 truncate text-muted-foreground md:table-cell">
              {stock.name}
            </TableCell>
            <TableCell className="text-right font-medium tabular-nums text-foreground">
              {formatCurrency(stock.price)}
            </TableCell>
            <TableCell className="text-right">
              <PriceChange
                change={stock.change}
                changePercent={stock.changePercent}
                showAbsolute={false}
                showIcon={false}
                className="justify-end"
              />
            </TableCell>
            <TableCell className="hidden text-right tabular-nums text-muted-foreground lg:table-cell">
              {formatMarketCap(stock.marketCap)}
            </TableCell>
            <TableCell>
              <div className="flex items-center justify-end gap-1">
                <WatchlistButton symbol={stock.symbol} size="icon-sm" />
                <Link
                  to={`/stocks/${stock.symbol}`}
                  aria-label={`View ${stock.symbol} details`}
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
                    'text-muted-foreground',
                  )}
                >
                  <Eye aria-hidden="true" />
                </Link>
                {onRemove ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${stock.symbol} from watchlist`}
                    onClick={() => onRemove(stock.symbol)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash aria-hidden="true" />
                  </Button>
                ) : null}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
