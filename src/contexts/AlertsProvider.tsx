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
  updateAlert as updateAlertRequest,
  type CreateAlertInput,
  type UpdateAlertInput,
} from '@/lib/api'
import type { PriceAlert } from '@/types'
import { useAuth } from './auth-context'
import { AlertsContext, type AlertsContextValue } from './alerts-context'

/**
 * Single source of truth for the signed-in user's price alerts. State is loaded
 * from the API and mutated there, then refetched, so the alerts page and the
 * admin preview always agree.
 */
export function AlertsProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [alerts, setAlerts] = useState<PriceAlert[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [pendingIds, setPendingIds] = useState<string[]>([])
  const abortRef = useRef<AbortController | null>(null)

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

  useEffect(() => {
    if (authLoading) return
    void load()
    return () => {
      abortRef.current?.abort()
    }
  }, [authLoading, load])

  const markPending = useCallback((id: string, active: boolean) => {
    setPendingIds((previous) =>
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
      return result.data.alerts
    } finally {
      setIsEvaluating(false)
    }
  }, [user])

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
    ],
  )

  return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>
}
