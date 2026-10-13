import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { DataStatus } from '@/lib/api'
import { formatDataStatus } from '@/lib/liveStock'

interface LiveBadgeProps {
  status?: DataStatus
  cached?: boolean
  stale?: boolean
}

export function LiveBadge({ status, cached, stale }: LiveBadgeProps) {
  const label = status ? formatDataStatus(status) : 'Live'
  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1.5 font-normal',
        stale
          ? 'border-amber-500/50 text-amber-600'
          : 'border-emerald-500/40 text-emerald-600',
      )}
    >
      <span
        className={cn(
          'size-1.5 rounded-full',
          stale ? 'bg-amber-500' : 'bg-emerald-500',
        )}
        aria-hidden="true"
      />
      {label}
      {cached ? ' · cached' : null}
    </Badge>
  )
}
