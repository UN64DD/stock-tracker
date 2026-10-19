/* eslint-disable react-hooks/set-state-in-effect -- This provider mirrors async alert state into React state. */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  createAlert as createAlertRequest,
  deleteAlert as deleteAlertRequest,
  evaluateAlerts as evaluateAlertsRequest,
  fetchAlerts,
  fetchNotifications,
  resendNotification as resendNotificationRequest,
  updateAlert as updateAlertRequest,
  updateNotificationPreferences,
  type CreateAlertInput,
  type UpdateAlertInput,
} from '@/lib/api'
import type { AlertNotification, PriceAlert } from '@/types'
import { useAuth } from './auth-context'
import { AlertsContext, type AlertsContextValue } from './alerts-context'

/**
 * Single source of truth for the signed-in user's price alerts and their
 * notification history. State is loaded from the API and mutated there, then
 * refetched, so the alerts page and the settings page always agree.
 */
export function AlertsProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [alerts, setAlerts] = useState<PriceAlert[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [pendingIds, setPendingIds] = useState<string[]>([])
  const [notifications, setNotifications] = useState<AlertNotification[]>([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notificationsError, setNotificationsError] = useState<unknown>(null)
  const [pendingNotificationIds, setPendingNotificationIds] = useState<string[]>([])
  const [priceAlertEmails, setPriceAlertEmailsState] = useState(true)
  const [emailConfigured, setEmailConfigured] = useState(true)
  const abortRef = useRef<AbortController | null>(null)
  const notificationsAbortRef = useRef<AbortController | null>(null)

  const load = useCallback(async () => {
    if (!user) {
      setAlerts([])
      setError(null)
      setLoading(false)
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setError(null)

    try {
      const result = await fetchAlerts(controller.signal)
      if (controller.signal.aborted) return
      setAlerts(result.data.alerts)
    } catch (loadError) {
      if (controller.signal.aborted) return
      setError(loadError)
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [user])

  const refreshNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([])
      setNotificationsError(null)
      setNotificationsLoading(false)
      return
    }

    notificationsAbortRef.current?.abort()
    const controller = new AbortController()
    notificationsAbortRef.current = controller
    setNotificationsLoading(true)
    setNotificationsError(null)

    try {
      const result = await fetchNotifications(controller.signal)
      if (controller.signal.aborted) return
      setNotifications(result.data.notifications)
      setPriceAlertEmailsState(result.data.preferences.priceAlertEmails)
      setEmailConfigured(result.data.emailConfigured)
    } catch (loadError) {
      if (controller.signal.aborted) return
      setNotificationsError(loadError)
    } finally {
      if (!controller.signal.aborted) setNotificationsLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (authLoading) return
    void load()
    void refreshNotifications()
    return () => {
      abortRef.current?.abort()
      notificationsAbortRef.current?.abort()
    }
  }, [authLoading, load, refreshNotifications])

  const markPending = useCallback((id: string, active: boolean) => {
    setPendingIds((previous) =>
      active
        ? previous.includes(id)
          ? previous
          : [...previous, id]
        : previous.filter((item) => item !== id),
    )
  }, [])

  const markNotificationPending = useCallback((id: string, active: boolean) => {
    setPendingNotificationIds((previous) =>
      active
        ? previous.includes(id)
          ? previous
          : [...previous, id]
        : previous.filter((item) => item !== id),
    )
  }, [])

  const createAlert = useCallback(
    async (input: CreateAlertInput) => {
      if (!user) throw new Error('You must be signed in to create an alert.')
      const result = await createAlertRequest(input)
      await load()
      return result.data.alert
    },
    [user, load],
  )

  const updateAlert = useCallback(
    async (id: string, changes: UpdateAlertInput) => {
      if (!user) throw new Error('You must be signed in to edit an alert.')
      markPending(id, true)
      try {
        const result = await updateAlertRequest(id, changes)
        await load()
        return result.data.alert
      } finally {
        markPending(id, false)
      }
    },
    [user, load, markPending],
  )

  const removeAlert = useCallback(
    async (id: string) => {
      if (!user) throw new Error('You must be signed in to delete an alert.')
      markPending(id, true)
      try {
        await deleteAlertRequest(id)
        await load()
      } finally {
        markPending(id, false)
      }
    },
    [user, load, markPending],
  )

  const setAlertEnabled = useCallback(
    (id: string, enabled: boolean) => updateAlert(id, { enabled }),
    [updateAlert],
  )

  const evaluateAlerts = useCallback(async () => {
    if (!user) throw new Error('You must be signed in to check your alerts.')
    setIsEvaluating(true)
    try {
      const result = await evaluateAlertsRequest()
      setAlerts(result.data.alerts)
      // Evaluation may have triggered notifications; refresh them alongside.
      await refreshNotifications()
      return result.data.alerts
    } finally {
      setIsEvaluating(false)
    }
  }, [user, refreshNotifications])

  const resendNotification = useCallback(
    async (id: string) => {
      if (!user) throw new Error('You must be signed in to resend a notification.')
      markNotificationPending(id, true)
      try {
        const result = await resendNotificationRequest(id)
        const updated = result.data.notification
        setNotifications((previous) =>
          previous.map((item) => (item.id === updated.id ? updated : item)),
        )
        return updated
      } finally {
        markNotificationPending(id, false)
      }
    },
    [user, markNotificationPending],
  )

  const setPriceAlertEmails = useCallback(
    async (enabled: boolean) => {
      if (!user) {
        throw new Error('You must be signed in to change notification preferences.')
      }
      // Optimistic update; the server response is authoritative.
      setPriceAlertEmailsState(enabled)
      try {
        const result = await updateNotificationPreferences(enabled)
        setPriceAlertEmailsState(result.data.preferences.priceAlertEmails)
      } catch (prefError) {
        setPriceAlertEmailsState(!enabled)
        throw prefError
      }
    },
    [user],
  )

  const value = useMemo<AlertsContextValue>(
    () => ({
      alerts,
      count: alerts.length,
      loading,
      error,
      isAuthenticated: Boolean(user),
      isEvaluating,
      pendingIds,
      createAlert,
      updateAlert,
      removeAlert,
      setAlertEnabled,
      evaluateAlerts,
      refresh: load,
      notifications,
      notificationsLoading,
      notificationsError,
      pendingNotificationIds,
      refreshNotifications,
      resendNotification,
      priceAlertEmails,
      emailConfigured,
      setPriceAlertEmails,
    }),
    [
      alerts,
      loading,
      error,
      user,
      isEvaluating,
      pendingIds,
      createAlert,
      updateAlert,
      removeAlert,
      setAlertEnabled,
      evaluateAlerts,
      load,
      notifications,
      notificationsLoading,
      notificationsError,
      pendingNotificationIds,
      refreshNotifications,
      resendNotification,
      priceAlertEmails,
      emailConfigured,
      setPriceAlertEmails,
    ],
  )

  return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>
}
