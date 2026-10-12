import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { PriceChange } from './PriceChange'

interface StatCardProps {
  label: string
  value: string
  change?: number
  changePercent?: number
  icon?: LucideIcon
  footer?: ReactNode
  className?: string
}

export function StatCard({
  label,
  value,
  change,
  changePercent,
  icon: Icon,
  footer,
  className,
}: StatCardProps) {
  return (
    <Card className={cn('p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon ? (
          <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Icon className="size-4" aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </p>
      <div className="mt-2 flex items-center gap-2">
        {change !== undefined && changePercent !== undefined ? (
          <PriceChange change={change} changePercent={changePercent} />
        ) : null}
      </div>
      {footer ? <div className="mt-2 text-xs text-muted-foreground">{footer}</div> : null}
    </Card>
  )
}
