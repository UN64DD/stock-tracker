import { TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ErrorStateProps {
  title?: string
  description?: string
  action?: ReactNode
  className?: string
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'This demo encountered an unexpected state. Try again or return to the dashboard.',
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center',
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <TriangleAlert className="size-6" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="text-base font-semibold text-foreground">{title}</p>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      {action}
    </div>
  )
}
