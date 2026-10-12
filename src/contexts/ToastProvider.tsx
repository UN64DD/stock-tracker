import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { ToastContext, type ToastContextValue } from './toast-context'
import type { Toast, ToastOptions } from './toast-types'
import { ToastViewport } from '@/components/ui/toast'

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counter = useRef(0)

  const dismiss = useCallback((id: string) => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id))
  }, [])

  const toast = useCallback(
    (options: ToastOptions) => {
      counter.current += 1
      const id = `toast-${Date.now()}-${counter.current}`
      const duration = options.duration ?? 4000
      const next: Toast = {
        id,
        title: options.title,
        description: options.description ?? '',
        variant: options.variant ?? 'default',
        duration,
      }
      setToasts((previous) => [...previous, next])
      if (duration > 0) {
        window.setTimeout(() => dismiss(id), duration)
      }
    },
    [dismiss],
  )

  const value = useMemo<ToastContextValue>(
    () => ({ toasts, toast, dismiss }),
    [toasts, toast, dismiss],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}
