import type {
  AlertCondition,
  AlertStatus,
  NotificationStatus,
  PriceAlert,
} from '@/types'
import { formatTarget } from '@/lib/format'

export const alertConditionLabels: Record<AlertCondition, string> = {
  price_above: 'Price rises above',
  price_below: 'Price falls below',
  percent_increase: 'Price increases by',
  percent_decrease: 'Price decreases by',
}

export const alertConditionShortLabels: Record<AlertCondition, string> = {
  price_above: 'Above',
  price_below: 'Below',
  percent_increase: 'Up %',
  percent_decrease: 'Down %',
}

export function isPercentCondition(condition: AlertCondition): boolean {
  return condition === 'percent_increase' || condition === 'percent_decrease'
}

export const alertStatusLabels: Record<AlertStatus, string> = {
  active: 'Active',
  triggered: 'Triggered',
  disabled: 'Disabled',
}

/**
 * Delivery-state labels for notification history rows. "Sent" means the email
 * provider accepted the message — only "Delivered" is confirmed via webhook.
 */
export const notificationStatusLabels: Record<NotificationStatus, string> = {
  pending: 'Pending',
  accepted: 'Sent',
  delivered: 'Delivered',
  failed: 'Failed',
}

export function describeAlertRule(
  alert: Pick<PriceAlert, 'condition' | 'threshold'>,
): string {
  return `${alertConditionLabels[alert.condition]} ${formatTarget(
    alert.threshold,
    isPercentCondition(alert.condition),
  )}`
}

export type AlertStatusFilter = 'all' | AlertStatus

export interface AlertFilter {
  status: AlertStatusFilter
  query: string
}

/**
 * Filters alerts by status and a symbol/company search term. Pure so it can be
 * unit-tested without rendering the page.
 */
export function filterAlerts(
  alerts: PriceAlert[],
  { status, query }: AlertFilter,
): PriceAlert[] {
  const term = query.trim().toLowerCase()
  return alerts.filter((alert) => {
    if (status !== 'all' && alert.status !== status) return false
    if (!term) return true
    return (
      alert.symbol.toLowerCase().includes(term) ||
      (alert.name?.toLowerCase().includes(term) ?? false)
    )
  })
}

export function countAlertsByStatus(
  alerts: PriceAlert[],
): Record<AlertStatus, number> {
  const counts: Record<AlertStatus, number> = {
    active: 0,
    triggered: 0,
    disabled: 0,
  }
  for (const alert of alerts) counts[alert.status] += 1
  return counts
}
