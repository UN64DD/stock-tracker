import { ValidationError } from '../lib/errors.js'
import type { HistoricalPoint } from '../providers/types.js'

export type AlertCondition =
  | 'price_above'
  | 'price_below'
  | 'percent_increase'
  | 'percent_decrease'

export const ALERT_CONDITIONS: readonly AlertCondition[] = [
  'price_above',
  'price_below',
  'percent_increase',
  'percent_decrease',
] as const

export type AlertStatus = 'active' | 'triggered' | 'disabled'

/** Largest threshold accepted, purely to reject absurd/overflowing input. */
export const MAX_ALERT_THRESHOLD = 1_000_000_000

export function isAlertCondition(value: unknown): value is AlertCondition {
  return (
    typeof value === 'string' &&
    (ALERT_CONDITIONS as readonly string[]).includes(value)
  )
}

export function parseAlertCondition(raw: unknown): AlertCondition {
  if (!isAlertCondition(raw)) {
    throw new ValidationError(
      `Unsupported alert condition. Supported conditions: ${ALERT_CONDITIONS.join(', ')}.`,
    )
  }
  return raw
}

export function isPercentCondition(condition: AlertCondition): boolean {
  return condition === 'percent_increase' || condition === 'percent_decrease'
}

/**
 * Parses a positive alert threshold. Prices must be positive and percentage
 * thresholds must be greater than zero, so a single `> 0` bound covers both;
 * the condition only changes how the value is interpreted.
 */
export function parseAlertThreshold(raw: unknown): number {
  const value = typeof raw === 'string' ? Number(raw) : raw
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ValidationError('Enter a numeric threshold value.')
  }
  if (value <= 0) {
    throw new ValidationError('The threshold must be greater than zero.')
  }
  if (value > MAX_ALERT_THRESHOLD) {
    throw new ValidationError('The threshold is unrealistically large.')
  }
  return value
}

function isValidPrice(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

export interface EvaluateAlertInput {
  condition: AlertCondition
  threshold: number
  /** Latest available price for the symbol. */
  latestPrice: number | null | undefined
  /**
   * Reference price at the start of the evaluation window. Required for the
   * percentage conditions and ignored otherwise.
   */
  baselinePrice?: number | null
}

export interface AlertEvaluationResult {
  triggered: boolean
  latestPrice: number | null
  baselinePrice: number | null
  /** Percentage change from the baseline, or `null` when it cannot be computed. */
  changePercent: number | null
  /** Human-readable explanation of the outcome (never provider text). */
  reason: string
}

/**
 * Evaluates a single alert against a normalized price. Pure and synchronous so
 * it can be unit-tested without a provider or database.
 *
 * - `price_above` triggers when `latestPrice >= threshold`.
 * - `price_below` triggers when `latestPrice <= threshold`.
 * - `percent_increase` triggers when the change from the baseline is
 *   `>= threshold` percent.
 * - `percent_decrease` triggers when the change from the baseline is
 *   `<= -threshold` percent.
 *
 * Percentage change is `(latestPrice - baselinePrice) / baselinePrice * 100`.
 */
export function evaluateAlert(input: EvaluateAlertInput): AlertEvaluationResult {
  const { condition, threshold, latestPrice } = input
  const baselinePrice = input.baselinePrice ?? null

  if (!isValidPrice(latestPrice)) {
    return {
      triggered: false,
      latestPrice: null,
      baselinePrice: baselinePrice,
      changePercent: null,
      reason: 'No valid latest price is available yet.',
    }
  }

  if (condition === 'price_above') {
    const triggered = latestPrice >= threshold
    return {
      triggered,
      latestPrice,
      baselinePrice: null,
      changePercent: null,
      reason: triggered
        ? `Price ${latestPrice} is at or above the ${threshold} target.`
        : `Price ${latestPrice} is below the ${threshold} target.`,
    }
  }

  if (condition === 'price_below') {
    const triggered = latestPrice <= threshold
    return {
      triggered,
      latestPrice,
      baselinePrice: null,
      changePercent: null,
      reason: triggered
        ? `Price ${latestPrice} is at or below the ${threshold} target.`
        : `Price ${latestPrice} is above the ${threshold} target.`,
    }
  }

  if (!isValidPrice(baselinePrice)) {
    return {
      triggered: false,
      latestPrice,
      baselinePrice: baselinePrice,
      changePercent: null,
      reason: 'No baseline price is available for percentage evaluation.',
    }
  }

  const changePercent = ((latestPrice - baselinePrice) / baselinePrice) * 100

  if (condition === 'percent_increase') {
    const triggered = changePercent >= threshold
    return {
      triggered,
      latestPrice,
      baselinePrice,
      changePercent,
      reason: triggered
        ? `Price rose ${changePercent.toFixed(2)}%, meeting the +${threshold}% target.`
        : `Price moved ${changePercent.toFixed(2)}%, below the +${threshold}% target.`,
    }
  }

  const triggered = changePercent <= -threshold
  return {
    triggered,
    latestPrice,
    baselinePrice,
    changePercent,
    reason: triggered
      ? `Price fell ${changePercent.toFixed(2)}%, meeting the -${threshold}% target.`
      : `Price moved ${changePercent.toFixed(2)}%, above the -${threshold}% target.`,
  }
}

export interface WindowPrices {
  baselinePrice: number | null
  latestPrice: number | null
}

/**
 * Picks the first and last valid observations from a historical series, ordered
 * by timestamp. The first valid observation is the baseline for percentage
 * alerts; the last is the latest price. Invalid (non-positive / non-finite)
 * observations are ignored, matching the rest of the price pipeline.
 */
export function selectWindowPrices(
  points: readonly HistoricalPoint[],
): WindowPrices {
  const valid = points
    .filter((point) => isValidPrice(point.value) && Number.isFinite(point.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp)

  if (valid.length === 0) {
    return { baselinePrice: null, latestPrice: null }
  }

  return {
    baselinePrice: valid[0].value,
    latestPrice: valid[valid.length - 1].value,
  }
}
