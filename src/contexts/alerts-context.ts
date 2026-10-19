import { createContext, useContext } from 'react'
import type { CreateAlertInput, UpdateAlertInput } from '@/lib/api'
import type { PriceAlert } from '@/types'

export interface AlertsContextValue {
  /** Server-persisted alerts for the signed-in user (empty when signed out). */
  alerts: PriceAlert[]
  count: number
  loading: boolean
  error: unknown
  isAuthenticated: boolean
  /** True while a "check now" evaluation request is in flight. */
  isEvaluating: boolean
  /** Alert ids with an in-flight update/delete request. */
  pendingIds: string[]
  /** All reject with an `ApiError` on failure so callers can surface a message. */
  createAlert: (input: CreateAlertInput) => Promise<PriceAlert>
  updateAlert: (id: string, changes: UpdateAlertInput) => Promise<PriceAlert>
  removeAlert: (id: string) => Promise<void>
  setAlertEnabled: (id: string, enabled: boolean) => Promise<PriceAlert>
  /** Evaluates enabled, not-yet-triggered alerts and returns the fresh list. */
  evaluateAlerts: () => Promise<PriceAlert[]>
  refresh: () => Promise<void>
}

export const AlertsContext = createContext<AlertsContextValue | null>(null)

export function useAlerts(): AlertsContextValue {
  const context = useContext(AlertsContext)
  if (!context) {
    throw new Error('useAlerts must be used within an AlertsProvider')
  }
  return context
}
