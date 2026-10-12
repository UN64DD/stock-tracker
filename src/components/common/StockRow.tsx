import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import type { Stock } from '@/types'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import { generateSparkline } from '@/mocks/history'
import { PriceChange } from './PriceChange'
import { Sparkline } from './Sparkline'

interface StockRowProps {
  stock: Stock
  rank?: number
  showSparkline?: boolean
  className?: string
}

export function SymbolBadge({
  symbol,
  accent,
  className,
}: {
  symbol: string
  accent: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold tracking-tight',
        className,
      )}
      style={{ backgroundColor: `${accent}1a`, color: accent }}
      aria-hidden="true"
    >
      {symbol.slice(0, 4)}
    </span>
  )
}

export function StockRow({
  stock,
  rank,
  showSparkline = true,
  className,
}: StockRowProps) {
  const sparkline = showSparkline
    ? generateSparkline(stock.symbol, stock.price)
    : []

  return (
    <Link
      to={`/stocks/${stock.symbol}`}
      className={cn(
        'group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-colors hover:border-border hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      {rank !== undefined ? (
        <span className="w-5 shrink-0 text-sm font-medium tabular-nums text-muted-foreground">
          {rank}
        </span>
      ) : null}
      <SymbolBadge symbol={stock.symbol} accent={stock.accent} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {stock.symbol}
        </p>
        <p className="truncate text-xs text-muted-foreground">{stock.name}</p>
      </div>
      {showSparkline ? (
        <Sparkline
          values={sparkline}
          positive={stock.changePercent >= 0}
          className="hidden h-9 w-20 sm:block"
        />
      ) : null}
      <div className="flex flex-col items-end text-right">
        <p className="text-sm font-semibold tabular-nums text-foreground">
          {formatCurrency(stock.price)}
        </p>
        <PriceChange
          change={stock.change}
          changePercent={stock.changePercent}
          showAbsolute={false}
          showIcon={false}
          className="text-xs"
        />
      </div>
      <ChevronRight
        className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  )
}
