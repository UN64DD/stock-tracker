import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ComponentProps,
  type ReactNode,
} from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DialogContextValue {
  close: () => void
}

const DialogContext = createContext<DialogContextValue | null>(null)

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
  className?: string
  'aria-label'?: string
}

export function Dialog({
  open,
  onOpenChange,
  children,
  className,
  'aria-label': ariaLabel,
}: DialogProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusTarget = contentRef.current?.querySelector<HTMLElement>(
      'input, textarea, select, button, [href], [tabindex]:not([tabindex="-1"])',
    )
    focusTarget?.focus()

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <DialogContext.Provider value={{ close: () => onOpenChange(false) }}>
      <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
          aria-hidden="true"
        />
        <div
          ref={contentRef}
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
          className={cn(
            'relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-xl border border-border bg-card text-card-foreground shadow-xl duration-200 animate-in fade-in-0 zoom-in-95 sm:rounded-xl',
            className,
          )}
        >
          {children}
          <DialogClose />
        </div>
      </div>
    </DialogContext.Provider>
  )
}

function DialogClose() {
  const context = useContext(DialogContext)
  return (
    <button
      type="button"
      onClick={() => context?.close()}
      aria-label="Close dialog"
      className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <X className="size-4" aria-hidden="true" />
    </button>
  )
}

export function DialogHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-col gap-1.5 p-5 pr-12', className)}
      {...props}
    />
  )
}

export function DialogTitle({ className, ...props }: ComponentProps<'h2'>) {
  return (
    <h2
      className={cn('text-lg font-semibold leading-tight', className)}
      {...props}
    />
  )
}

export function DialogDescription({
  className,
  ...props
}: ComponentProps<'p'>) {
  return (
    <p className={cn('text-sm text-muted-foreground', className)} {...props} />
  )
}

export function DialogBody({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('px-5 pb-5', className)} {...props} />
}

export function DialogFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse gap-2 border-t border-border p-5 sm:flex-row sm:justify-end',
        className,
      )}
      {...props}
    />
  )
}
