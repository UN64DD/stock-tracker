import { createContext, useContext } from 'react'
import type { Toast, ToastOptions } from './toast-types'

export interface ToastContextValue {
  toasts: Toast[]
  toast: (options: ToastOptions) => void
  dismiss: (id: string) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
