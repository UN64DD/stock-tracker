import type { CompanyProfile, Quote } from '@/lib/api'
import type { Stock } from '@/types'

const ACCENT_PALETTE = [
  '#0ea5e9',
  '#2563eb',
  '#22c55e',
  '#ef4444',
  '#f59e0b',
  '#6366f1',
  '#dc2626',
  '#ea580c',
  '#b91c1c',
  '#0369a1',
  '#1d4ed8',
  '#0891b2',
  '#7c3aed',
  '#0f766e',
  '#16a34a',
  '#65a30d',
  '#e11d48',
  '#0284c7',
]

export const UNAVAILABLE = '—'

/** Stable accent color derived from a symbol, used by badge components. */
export function accentForSymbol(symbol: string): string {
  let hash = 0
  for (let i = 0; i < symbol.length; i += 1) {
    hash = (hash * 31 + symbol.charCodeAt(i)) >>> 0
  }
  return ACCENT_PALETTE[hash % ACCENT_PALETTE.length]
}

/**
 * Adapts a live quote (plus optional profile) to the UI `Stock` shape. Fields
 * the free-tier provider does not expose (fundamentals) fall back to safe
 * placeholders so existing presentational components keep working.
 */
export function toStockView(quote: Quote, profile?: CompanyProfile | null): Stock {
  return {
    symbol: quote.symbol,
    name: quote.name ?? profile?.name ?? quote.symbol,
    sector: profile?.sector ?? UNAVAILABLE,
    industry: profile?.industry ?? UNAVAILABLE,
    price: quote.price,
    previousClose: quote.previousClose ?? quote.price,
    change: quote.change ?? 0,
    changePercent: quote.changePercent ?? 0,
    marketCap: profile?.marketCap ?? 0,
    peRatio: 0,
    eps: 0,
    dividendYield: 0,
    high52: quote.high52Week ?? 0,
    low52: quote.low52Week ?? 0,
    volume: quote.volume ?? 0,
    avgVolume: quote.averageVolume ?? 0,
    description: profile?.description ?? '',
    accent: accentForSymbol(quote.symbol),
  }
}

export function formatDataStatus(status: string): string {
  switch (status) {
    case 'real-time':
      return 'Real-time'
    case 'delayed':
      return 'Delayed'
    case 'end-of-day':
      return 'End-of-day'
    default:
      return 'Live'
  }
}
