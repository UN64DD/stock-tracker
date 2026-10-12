import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatChange, formatPercent } from '@/lib/format'

interface PriceChangeProps {
  change: number
  changePercent: number
  showIcon?: boolean
  showAbsolute?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export function PriceChange({
  change,
  changePercent,
  showIcon = true,
  showAbsolute = true,
  size = 'sm',
  className,
}: PriceChangeProps) {
  const direction =
    changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'flat'

  const tone = {
    up: 'text-emerald-600 dark:text-emerald-400',
    down: 'text-red-600 dark:text-red-400',
    flat: 'text-muted-foreground',
  }[direction]

  const Icon =
    direction === 'up'
      ? ArrowUpRight
      : direction === 'down'
        ? ArrowDownRight
        : Minus

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium tabular-nums',
        size === 'sm' ? 'text-sm' : 'text-base',
        tone,
        className,
      )}
    >
      {showIcon ? <Icon className="size-3.5 shrink-0" aria-hidden="true" /> : null}
      {showAbsolute ? <span>{formatChange(change)}</span> : null}
      <span>({formatPercent(changePercent)})</span>
    </span>
  )
}
