import type { ChartRange, HistoricalPoint } from '@/types'

/**
 * Ranges offered by the chart control panel. All of these map to a Twelve Data
 * `time_series` interval the provider supports; keep this list in sync with the
 * server's `CHART_RANGES`.
 */
export const chartRanges: ChartRange[] = ['1D', '1W', '1M', '3M', '6M', '1Y', '5Y']

const INTRADAY_RANGES: ReadonlySet<ChartRange> = new Set<ChartRange>(['1D', '1W'])

export function isIntradayRange(range: ChartRange): boolean {
  return INTRADAY_RANGES.has(range)
}

const dayFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

const intradayFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'UTC',
})

/** Formats a chart observation timestamp (UTC) for axis labels and tooltips. */
export function formatObservationTimestamp(timestamp: number, intraday: boolean): string {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return '—'
  return (intraday ? intradayFormatter : dayFormatter).format(date)
}

export interface PeriodStats {
  /** First valid close in the selected window. */
  open: number
  /** Last valid close in the selected window. */
  close: number
  high: number
  low: number
  /** close - open, in price units. */
  change: number
  /** (close - open) / open * 100, in percent. */
  changePercent: number
  firstTimestamp: number
  lastTimestamp: number
  count: number
}

/**
 * Drops observations with non-finite values or timestamps, sorts them into
 * chronological order, and removes duplicate timestamps. Provider payloads are
 * normally already ordered, but the chart must never render misleading data if
 * they are not.
 */
export function normalizeHistoryPoints(points: readonly HistoricalPoint[]): HistoricalPoint[] {
  const valid = points.filter(
    (point) =>
      point != null &&
      Number.isFinite(point.timestamp) &&
      Number.isFinite(point.value) &&
      point.timestamp > 0,
  )

  const sorted = [...valid].sort((a, b) => a.timestamp - b.timestamp)

  return sorted.filter(
    (point, index) => index === 0 || point.timestamp !== sorted[index - 1].timestamp,
  )
}

/**
 * Computes opening/closing prices, the high/low, and the absolute and
 * percentage change across a set of observations. Returns `null` when there are
 * no valid observations; percentage change is left at `0` when the opening
 * price is zero (division is undefined rather than genuinely flat).
 */
export function computePeriodStats(points: readonly HistoricalPoint[]): PeriodStats | null {
  const normalized = normalizeHistoryPoints(points)
  if (normalized.length === 0) return null

  const first = normalized[0]
  const last = normalized[normalized.length - 1]
  let high = first.value
  let low = first.value

  for (const point of normalized) {
    if (point.value > high) high = point.value
    if (point.value < low) low = point.value
  }

  const change = last.value - first.value
  const changePercent = first.value !== 0 ? (change / first.value) * 100 : 0

  return {
    open: first.value,
    close: last.value,
    high,
    low,
    change,
    changePercent,
    firstTimestamp: first.timestamp,
    lastTimestamp: last.timestamp,
    count: normalized.length,
  }
}
