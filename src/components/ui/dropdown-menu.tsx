import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/utils'

interface DropdownMenuProps {
  trigger: ReactNode
  children: ReactNode | ((close: () => void) => ReactNode)
  align?: 'start' | 'end'
  className?: string
  contentClassName?: string
  triggerClassName?: string
  label?: string
}

export function DropdownMenu({
  trigger,
  children,
  align = 'end',
  className,
  contentClassName,
  triggerClassName,
  label = 'Open menu',
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((previous) => !previous)}
        className={cn(
          'inline-flex items-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
          triggerClassName,
        )}
      >
        {trigger}
      </button>
      {open ? (
        <div
          role="menu"
          className={cn(
            'absolute z-50 mt-2 min-w-48 overflow-hidden rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg duration-150 animate-in fade-in-0 zoom-in-95',
            align === 'end' ? 'right-0' : 'left-0',
            contentClassName,
          )}
        >
          {typeof children === 'function' ? children(() => setOpen(false)) : children}
        </div>
      ) : null}
    </div>
  )
}

export function DropdownMenuItem({
  className,
  ...props
}: ComponentProps<'button'>) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
        className,
      )}
      {...props}
    />
  )
}

export function DropdownMenuLabel({
  className,
  ...props
}: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'px-3 py-1.5 text-xs font-medium text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}

export function DropdownMenuSeparator({
  className,
  ...props
}: ComponentProps<'div'>) {
  return (
    <div
      className={cn('-mx-1 my-1 h-px bg-border', className)}
      {...props}
    />
  )
}
