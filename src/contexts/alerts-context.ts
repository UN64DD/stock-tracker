import { createContext, useContext } from 'react'
import type { PriceAlert } from '@/types'

export interface AlertsContextValue {
  alerts: PriceAlert[]
  addAlert: (alert: Omit<PriceAlert, 'id' | 'createdAt'>) => void
  updateAlert: (id: string, changes: Partial<PriceAlert>) => void
  removeAlert: (id: string) => void
  toggleAlert: (id: string) => void
}

export const AlertsContext = createContext<AlertsContextValue | null>(null)

export function useAlerts(): AlertsContextValue {
  const context = useContext(AlertsContext)
  if (!context) {
    throw new Error('useAlerts must be used within an AlertsProvider')
  }
  return context
}
