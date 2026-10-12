import { useMemo, type ReactNode } from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { defaultAlerts } from '@/mocks/alerts'
import { DEMO_NOW } from '@/mocks/history'
import { STORAGE_KEYS } from '@/lib/storage'
import type { PriceAlert } from '@/types'
import { AlertsContext, type AlertsContextValue } from './alerts-context'

let alertCounter = 0

function createAlertId(): string {
  alertCounter += 1
  return `alert-${DEMO_NOW}-${alertCounter}`
}

export function AlertsProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useLocalStorage<PriceAlert[]>(
    STORAGE_KEYS.alerts,
    defaultAlerts,
  )

  const value = useMemo<AlertsContextValue>(
    () => ({
      alerts,
      addAlert: (alert) =>
        setAlerts((previous) => [
          ...previous,
          {
            ...alert,
            id: createAlertId(),
            createdAt: new Date(DEMO_NOW).toISOString(),
          },
        ]),
      updateAlert: (id, changes) =>
        setAlerts((previous) =>
          previous.map((alert) =>
            alert.id === id ? { ...alert, ...changes } : alert,
          ),
        ),
      removeAlert: (id) =>
        setAlerts((previous) => previous.filter((alert) => alert.id !== id)),
      toggleAlert: (id) =>
        setAlerts((previous) =>
          previous.map((alert) =>
            alert.id === id ? { ...alert, enabled: !alert.enabled } : alert,
          ),
        ),
    }),
    [alerts, setAlerts],
  )

  return (
    <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>
  )
}
