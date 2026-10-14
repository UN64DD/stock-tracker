import type { ChartRange, HistoricalPoint } from '@/types'

export const DEMO_NOW = Date.UTC(2026, 0, 5, 16, 0, 0)

export function minutesAgo(minutes: number): string {
  return new Date(DEMO_NOW - minutes * 60_000).toISOString()
}

export function hoursAgo(hours: number): string {
  return new Date(DEMO_NOW - hours * 3_600_000).toISOString()
}

export function daysAgo(days: number): string {
  return new Date(DEMO_NOW - days * 86_400_000).toISOString()
}

interface RangeConfig {
  points: number
  stepMs: number
  volatility: number
  label: (date: Date) => string
}

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'UTC',
})

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

export { chartRanges } from '@/lib/chart'

const rangeConfig: Record<ChartRange, RangeConfig> = {
  '1D': {
    points: 40,
    stepMs: 10 * 60_000,
    volatility: 0.004,
    label: (date) => timeFormatter.format(date),
  },
  '1W': {
    points: 7,
    stepMs: 86_400_000,
    volatility: 0.012,
    label: (date) => dateFormatter.format(date),
  },
  '1M': {
    points: 30,
    stepMs: 86_400_000,
    volatility: 0.018,
    label: (date) => dateFormatter.format(date),
  },
  '3M': {
    points: 45,
    stepMs: 2 * 86_400_000,
    volatility: 0.03,
    label: (date) => dateFormatter.format(date),
  },
  '6M': {
    points: 63,
    stepMs: 3 * 86_400_000,
    volatility: 0.045,
    label: (date) => dateFormatter.format(date),
  },
  '1Y': {
    points: 52,
    stepMs: 7 * 86_400_000,
    volatility: 0.06,
    label: (date) => dateFormatter.format(date),
  },
  '5Y': {
    points: 60,
    stepMs: 30 * 86_400_000,
    volatility: 0.12,
    label: (date) => dateFormatter.format(date),
  },
}

function hashString(value: string): number {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mulberry32(seed: number): () => number {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function generateHistory(
  key: string,
  range: ChartRange,
  endValue: number,
): HistoricalPoint[] {
  const config = rangeConfig[range]
  const random = mulberry32(hashString(`${key}:${range}`))
  const count = config.points

  const hash = hashString(`${key}:${range}:start`)
  const startFactor = 0.86 + (hash % 29) / 100

  const base = Math.max(endValue / startFactor, 0.01)
  const drift = (endValue - base) / (count - 1)

  let shock = 0
  const points: HistoricalPoint[] = []
  let current = base

  for (let i = 0; i < count; i += 1) {
    if (i > 0) {
      shock += (random() - 0.5) * 2
      const damped = shock * 0.35
      current = current + drift + damped * endValue * config.volatility
      current = Math.max(current, 0.01)
    }

    const timestamp = DEMO_NOW - (count - 1 - i) * config.stepMs
    const date = new Date(timestamp)

    points.push({
      timestamp,
      label: config.label(date),
      value: Number(current.toFixed(2)),
    })
  }

  points[points.length - 1] = {
    ...points[points.length - 1],
    value: Number(endValue.toFixed(2)),
  }

  return points
}

export function generateSparkline(
  key: string,
  endValue: number,
  pointCount = 24,
): number[] {
  const history = generateHistory(key, '3M', endValue)
  if (history.length <= pointCount) {
    return history.map((point) => point.value)
  }
  const step = (history.length - 1) / (pointCount - 1)
  const sampled: number[] = []
  for (let i = 0; i < pointCount; i += 1) {
    sampled.push(history[Math.round(i * step)].value)
  }
  return sampled
}
