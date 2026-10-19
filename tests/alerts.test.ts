import { describe, expect, it } from 'vitest'
import type { PriceAlert } from '@/types'
import {
  countAlertsByStatus,
  describeAlertRule,
  filterAlerts,
  isPercentCondition,
  notificationStatusLabels,
} from '@/lib/alerts'

function makeAlert(overrides: Partial<PriceAlert> & { id: string; symbol: string }): PriceAlert {
  return {
    name: null,
    condition: 'price_above',
    threshold: 200,
    enabled: true,
    status: 'active',
    triggeredAt: null,
    lastCheckedAt: null,
    lastPrice: null,
    baselinePrice: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

const sample: PriceAlert[] = [
  makeAlert({ id: '1', symbol: 'AAPL', name: 'Apple Inc.', condition: 'price_above', threshold: 250 }),
  makeAlert({
    id: '2',
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    condition: 'percent_increase',
    threshold: 5,
    status: 'triggered',
    enabled: false,
  }),
  makeAlert({
    id: '3',
    symbol: 'MSFT',
    name: 'Microsoft',
    condition: 'price_below',
    threshold: 300,
    enabled: false,
    status: 'disabled',
  }),
  makeAlert({ id: '4', symbol: 'NVDA', condition: 'percent_decrease', threshold: 10 }),
]

describe('isPercentCondition', () => {
  it('treats only percentage conditions as percentages', () => {
    expect(isPercentCondition('price_above')).toBe(false)
    expect(isPercentCondition('price_below')).toBe(false)
    expect(isPercentCondition('percent_increase')).toBe(true)
    expect(isPercentCondition('percent_decrease')).toBe(true)
  })
})

describe('describeAlertRule', () => {
  it('formats price conditions as currency', () => {
    expect(
      describeAlertRule({ condition: 'price_above', threshold: 250 }),
    ).toBe('Price rises above $250.00')
  })

  it('formats percentage conditions with a percent suffix', () => {
    expect(
      describeAlertRule({ condition: 'percent_decrease', threshold: 10 }),
    ).toBe('Price decreases by 10.00%')
  })
})

describe('filterAlerts', () => {
  it('returns everything for the all-status filter with no query', () => {
    expect(filterAlerts(sample, { status: 'all', query: '' })).toHaveLength(4)
  })

  it('filters by status', () => {
    expect(filterAlerts(sample, { status: 'active', query: '' }).map((a) => a.id)).toEqual([
      '1',
      '4',
    ])
    expect(filterAlerts(sample, { status: 'triggered', query: '' }).map((a) => a.id)).toEqual([
      '2',
    ])
    expect(filterAlerts(sample, { status: 'disabled', query: '' }).map((a) => a.id)).toEqual([
      '3',
    ])
  })

  it('searches by symbol and name, case-insensitively', () => {
    expect(filterAlerts(sample, { status: 'all', query: 'tsl' }).map((a) => a.symbol)).toEqual([
      'TSLA',
    ])
    expect(
      filterAlerts(sample, { status: 'all', query: 'microsoft' }).map((a) => a.symbol),
    ).toEqual(['MSFT'])
  })

  it('combines status and query filters', () => {
    expect(
      filterAlerts(sample, { status: 'triggered', query: 'tesla' }).map((a) => a.id),
    ).toEqual(['2'])
    expect(filterAlerts(sample, { status: 'active', query: 'tesla' })).toEqual([])
  })

  it('does not mutate the input array', () => {
    const before = sample.map((a) => a.id)
    filterAlerts(sample, { status: 'triggered', query: 'a' })
    expect(sample.map((a) => a.id)).toEqual(before)
  })
})

describe('countAlertsByStatus', () => {
  it('counts each status bucket', () => {
    expect(countAlertsByStatus(sample)).toEqual({
      active: 2,
      triggered: 1,
      disabled: 1,
    })
  })

  it('returns zeros for an empty list', () => {
    expect(countAlertsByStatus([])).toEqual({ active: 0, triggered: 0, disabled: 0 })
  })
})

describe('notificationStatusLabels', () => {
  it('labels every delivery state, keeping accepted distinct from delivered', () => {
    expect(notificationStatusLabels).toEqual({
      pending: 'Pending',
      accepted: 'Sent',
      delivered: 'Delivered',
      failed: 'Failed',
    })
  })
})
