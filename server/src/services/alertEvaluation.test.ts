import { describe, expect, it } from 'vitest'
import { ValidationError } from '../lib/errors.js'
import {
  evaluateAlert,
  parseAlertCondition,
  parseAlertThreshold,
  selectWindowPrices,
} from './alertEvaluation.js'

describe('parseAlertCondition', () => {
  it('accepts the four supported conditions', () => {
    for (const condition of [
      'price_above',
      'price_below',
      'percent_increase',
      'percent_decrease',
    ] as const) {
      expect(parseAlertCondition(condition)).toBe(condition)
    }
  })

  it('rejects unknown conditions', () => {
    expect(() => parseAlertCondition('price_sideways')).toThrow(ValidationError)
    expect(() => parseAlertCondition(undefined)).toThrow(ValidationError)
  })
})

describe('parseAlertThreshold', () => {
  it('accepts positive finite numbers and numeric strings', () => {
    expect(parseAlertThreshold(250)).toBe(250)
    expect(parseAlertThreshold('5.5')).toBe(5.5)
  })

  it('rejects zero, negatives, non-numeric and absurd values', () => {
    expect(() => parseAlertThreshold(0)).toThrow(ValidationError)
    expect(() => parseAlertThreshold(-3)).toThrow(ValidationError)
    expect(() => parseAlertThreshold('abc')).toThrow(ValidationError)
    expect(() => parseAlertThreshold(Infinity)).toThrow(ValidationError)
    expect(() => parseAlertThreshold(1_000_000_001)).toThrow(ValidationError)
  })
})

describe('evaluateAlert: absolute price conditions', () => {
  it('triggers price_above at or above the threshold', () => {
    expect(
      evaluateAlert({ condition: 'price_above', threshold: 100, latestPrice: 100 })
        .triggered,
    ).toBe(true)
    expect(
      evaluateAlert({ condition: 'price_above', threshold: 100, latestPrice: 101 })
        .triggered,
    ).toBe(true)
    expect(
      evaluateAlert({ condition: 'price_above', threshold: 100, latestPrice: 99 })
        .triggered,
    ).toBe(false)
  })

  it('triggers price_below at or below the threshold', () => {
    expect(
      evaluateAlert({ condition: 'price_below', threshold: 100, latestPrice: 100 })
        .triggered,
    ).toBe(true)
    expect(
      evaluateAlert({ condition: 'price_below', threshold: 100, latestPrice: 99 })
        .triggered,
    ).toBe(true)
    expect(
      evaluateAlert({ condition: 'price_below', threshold: 100, latestPrice: 101 })
        .triggered,
    ).toBe(false)
  })

  it('does not trigger without a valid latest price', () => {
    const result = evaluateAlert({
      condition: 'price_above',
      threshold: 100,
      latestPrice: null,
    })
    expect(result.triggered).toBe(false)
    expect(result.latestPrice).toBeNull()
  })
})

describe('evaluateAlert: percentage conditions', () => {
  it('computes the change from the baseline and triggers an increase', () => {
    const result = evaluateAlert({
      condition: 'percent_increase',
      threshold: 5,
      latestPrice: 110,
      baselinePrice: 100,
    })
    expect(result.changePercent).toBeCloseTo(10)
    expect(result.triggered).toBe(true)
  })

  it('does not trigger when the increase is below the threshold', () => {
    const result = evaluateAlert({
      condition: 'percent_increase',
      threshold: 20,
      latestPrice: 110,
      baselinePrice: 100,
    })
    expect(result.triggered).toBe(false)
  })

  it('triggers a decrease at or beyond the negative threshold', () => {
    expect(
      evaluateAlert({
        condition: 'percent_decrease',
        threshold: 10,
        latestPrice: 90,
        baselinePrice: 100,
      }).triggered,
    ).toBe(true)
    expect(
      evaluateAlert({
        condition: 'percent_decrease',
        threshold: 5,
        latestPrice: 90,
        baselinePrice: 100,
      }).triggered,
    ).toBe(true)
    expect(
      evaluateAlert({
        condition: 'percent_decrease',
        threshold: 15,
        latestPrice: 90,
        baselinePrice: 100,
      }).triggered,
    ).toBe(false)
  })

  it('does not trigger without a valid baseline', () => {
    const result = evaluateAlert({
      condition: 'percent_increase',
      threshold: 5,
      latestPrice: 110,
      baselinePrice: 0,
    })
    expect(result.triggered).toBe(false)
    expect(result.changePercent).toBeNull()
  })
})

describe('selectWindowPrices', () => {
  it('returns the first and last valid observations in timestamp order', () => {
    const result = selectWindowPrices([
      { timestamp: 2, label: 'b', value: 120 },
      { timestamp: 1, label: 'a', value: 100 },
      { timestamp: 3, label: 'c', value: 130 },
    ])
    expect(result).toEqual({ baselinePrice: 100, latestPrice: 130 })
  })

  it('ignores invalid and non-positive observations', () => {
    const result = selectWindowPrices([
      { timestamp: 1, label: 'a', value: 0 },
      { timestamp: 2, label: 'b', value: 100 },
      { timestamp: 3, label: 'c', value: Number.NaN },
      { timestamp: 4, label: 'd', value: 110 },
    ])
    expect(result).toEqual({ baselinePrice: 100, latestPrice: 110 })
  })

  it('returns nulls for an empty series', () => {
    expect(selectWindowPrices([])).toEqual({
      baselinePrice: null,
      latestPrice: null,
    })
  })
})
