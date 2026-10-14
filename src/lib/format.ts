import { DEMO_NOW } from '@/mocks/history'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

const compactFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 2,
})

const currencyFormatters = new Map<string, Intl.NumberFormat>()

function currencyFormatterFor(currency: string): Intl.NumberFormat {
  const cached = currencyFormatters.get(currency)
  if (cached) return cached
  let formatter: Intl.NumberFormat
  try {
    formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency })
  } catch {
    formatter = currencyFormatter
  }
  currencyFormatters.set(currency, formatter)
  return formatter
}

export function formatCurrency(value: number, currency = 'USD'): string {
  const code = currency?.trim() || 'USD'
  if (code === 'USD') return currencyFormatter.format(value)
  return currencyFormatterFor(code.toUpperCase()).format(value)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

export function formatCompact(value: number): string {
  return compactFormatter.format(value)
}

export function formatCompactCurrency(value: number, currency = 'USD'): string {
  const symbol = currencySymbol(currency)
  return `${symbol}${compactFormatter.format(value)}`
}

export function formatMarketCap(value: number, currency = 'USD'): string {
  return formatCompactCurrency(value, currency)
}

function currencySymbol(currency: string): string {
  const parts = currencyFormatterFor(currency?.trim()?.toUpperCase() || 'USD').formatToParts(0)
  return parts.find((part) => part.type === 'currency')?.value ?? '$'
}

export function formatVolume(value: number): string {
  return compactFormatter.format(value)
}

export function formatChange(value: number, currency = 'USD'): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${formatCurrency(Math.abs(value), currency)}`
}

export function formatPercent(value: number, withSign = true): string {
  const sign = withSign ? (value > 0 ? '+' : value < 0 ? '−' : '') : ''
  return `${sign}${Math.abs(value).toFixed(2)}%`
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(iso))
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(iso))
}

export function formatRelativeTime(iso: string): string {
  return formatRelativeToNow(iso, DEMO_NOW)
}

/**
 * Formats an ISO timestamp relative to a real "now" (defaults to the current
 * clock). Use this for live data — `formatRelativeTime` is anchored to the
 * fixed demo clock and is only appropriate for mock data.
 */
export function formatRelativeToNow(iso: string, now: number = Date.now()): string {
  const diffMs = now - new Date(iso).getTime()
  const minutes = Math.max(0, Math.round(diffMs / 60_000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.round(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  const months = Math.round(days / 30)
  return `${months}mo ago`
}

export function formatTarget(
  value: number,
  isPercent: boolean,
): string {
  return isPercent ? `${value.toFixed(2)}%` : currencyFormatter.format(value)
}
