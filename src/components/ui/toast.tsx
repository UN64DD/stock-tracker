import {
  CircleAlert,
  CircleCheckBig,
  Info,
  TriangleAlert,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Toast } from '@/contexts/toast-types'

const toneStyles: Record<
  NonNullable<Toast['variant']>,
  { icon: typeof Info; className: string }
> = {
  default: { icon: Info, className: 'text-muted-foreground' },
  success: { icon: CircleCheckBig, className: 'text-emerald-600 dark:text-emerald-400' },
  error: { icon: CircleAlert, className: 'text-red-600 dark:text-red-400' },
  warning: { icon: TriangleAlert, className: 'text-amber-600 dark:text-amber-400' },
}

interface ToastViewportProps {
  toasts: Toast[]
  onDismiss: (id: string) => void
}

export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  if (toasts.length === 0) return null

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:top-0 sm:bottom-auto sm:items-end"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => {
        const tone = toneStyles[toast.variant]
        const Icon = tone.icon
        return (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-lg duration-200 animate-in fade-in-0 slide-in-from-bottom-2 sm:slide-in-from-right-2"
          >
            <Icon className={cn('mt-0.5 size-4 shrink-0', tone.className)} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{toast.title}</p>
              {toast.description ? (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {toast.description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
