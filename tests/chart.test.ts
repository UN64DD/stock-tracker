import { describe, expect, it } from 'vitest'
import {
  chartRanges,
  computePeriodStats,
  formatObservationTimestamp,
  isIntradayRange,
  normalizeHistoryPoints,
} from '@/lib/chart'
import type { HistoricalPoint } from '@/types'

function point(timestamp: number, value: number): HistoricalPoint {
  return { timestamp, label: `t${timestamp}`, value }
}

describe('chartRanges', () => {
  it('exposes every supported range in order', () => {
    expect(chartRanges).toEqual(['1D', '1W', '1M', '3M', '6M', '1Y', '5Y'])
  })

  it('classifies intraday ranges', () => {
    expect(isIntradayRange('1D')).toBe(true)
    expect(isIntradayRange('1W')).toBe(true)
    expect(isIntradayRange('6M')).toBe(false)
    expect(isIntradayRange('5Y')).toBe(false)
  })
})

describe('normalizeHistoryPoints', () => {
  it('drops invalid observations and sorts remaining ones', () => {
    const result = normalizeHistoryPoints([
      point(3000, 30),
      { timestamp: 1000, label: 'bad', value: Number.NaN },
      point(1000, 10),
      { timestamp: Number.NaN, label: 'bad', value: 5 },
      point(2000, 20),
    ])

    expect(result.map((entry) => entry.value)).toEqual([10, 20, 30])
    expect(result.map((entry) => entry.timestamp)).toEqual([1000, 2000, 3000])
  })

  it('removes duplicate timestamps keeping the first observation', () => {
    const result = normalizeHistoryPoints([point(1000, 10), point(1000, 99), point(2000, 20)])
    expect(result).toHaveLength(2)
    expect(result[0].value).toBe(10)
  })

  it('returns an empty array for an empty dataset', () => {
    expect(normalizeHistoryPoints([])).toEqual([])
  })
})

describe('computePeriodStats', () => {
  it('computes open, close, high, low and percentage change', () => {
    const stats = computePeriodStats([point(3000, 120), point(1000, 100), point(2000, 150)])
    expect(stats).not.toBeNull()
    expect(stats).toMatchObject({
      open: 100,
      close: 120,
      high: 150,
      low: 100,
      change: 20,
      firstTimestamp: 1000,
      lastTimestamp: 3000,
      count: 3,
    })
    expect(stats?.changePercent).toBeCloseTo(20)
  })

  it('returns null for an empty dataset', () => {
    expect(computePeriodStats([])).toBeNull()
  })

  it('reports zero change for a single observation', () => {
    const stats = computePeriodStats([point(1000, 42)])
    expect(stats).toMatchObject({ open: 42, close: 42, change: 0, changePercent: 0 })
  })

  it('avoids a divide-by-zero percentage when the opening price is zero', () => {
    const stats = computePeriodStats([point(1000, 0), point(2000, 10)])
    expect(stats?.changePercent).toBe(0)
    expect(stats?.change).toBe(10)
  })
})

describe('formatObservationTimestamp', () => {
  const timestamp = Date.UTC(2024, 5, 3, 14, 30, 0)

  it('includes the time for intraday ranges', () => {
    const label = formatObservationTimestamp(timestamp, true)
    expect(label).toContain('Jun 3')
    expect(label).toContain('14:30')
  })

  it('shows only the date for daily and longer ranges', () => {
    const label = formatObservationTimestamp(timestamp, false)
    expect(label).toContain('Jun 3, 2024')
    expect(label).not.toContain('14:30')
  })

  it('returns a placeholder for an invalid timestamp', () => {
    expect(formatObservationTimestamp(Number.NaN, false)).toBe('—')
  })
})
