import { LoaderCircle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface LoadingStateProps {
  label?: string
  variant?: 'spinner' | 'rows' | 'cards'
  className?: string
}

export function LoadingState({
  label = 'Loading demo data…',
  variant = 'spinner',
  className,
}: LoadingStateProps) {
  if (variant === 'rows') {
    return (
      <div className={cn('space-y-2', className)} aria-busy="true">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-14 w-full" />
        ))}
        <span className="sr-only">{label}</span>
      </div>
    )
  }

  if (variant === 'cards') {
    return (
      <div
        className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}
        aria-busy="true"
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full" />
        ))}
        <span className="sr-only">{label}</span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-2 rounded-xl border border-dashed border-border px-6 py-12 text-sm text-muted-foreground',
        className,
      )}
      role="status"
    >
      <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
      {label}
    </div>
  )
}
