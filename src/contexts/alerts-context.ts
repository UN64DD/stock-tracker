import { createContext, useContext } from 'react'
import type { CreateAlertInput, UpdateAlertInput } from '@/lib/api'
import type { AlertNotification, PriceAlert } from '@/types'

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

  /** Notification history for triggered alerts (email delivery state). */
  notifications: AlertNotification[]
  notificationsLoading: boolean
  notificationsError: unknown
  /** Notification ids with an in-flight resend request. */
  pendingNotificationIds: string[]
  refreshNotifications: () => Promise<void>
  /** Retries a failed notification email. Resolves to the updated record. */
  resendNotification: (id: string) => Promise<AlertNotification>

  /** Server-side preference: send an email when a price alert triggers. */
  priceAlertEmails: boolean
  /** False when the server has no email provider credentials configured. */
  emailConfigured: boolean
  setPriceAlertEmails: (enabled: boolean) => Promise<void>
}

export const AlertsContext = createContext<AlertsContextValue | null>(null)

export function useAlerts(): AlertsContextValue {
  const context = useContext(AlertsContext)
  if (!context) {
    throw new Error('useAlerts must be used within an AlertsProvider')
  }
  return context
}
