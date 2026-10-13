import { ProviderRateLimitError } from './errors.js'

const MINUTE_MS = 60_000
const DAY_MS = 86_400_000

/**
 * Tracks estimated provider credit usage so the proxy never knowingly exceeds
 * the configured free-tier allowance. When the budget is exhausted the caller
 * should fall back to cached data where possible.
 */
export class ProviderBudget {
  private minuteEvents: Array<{ at: number; cost: number }> = []
  private dayCount = 0
  private dayResetAt: number

  constructor(
    private readonly perMinute: number,
    private readonly perDay: number,
    now = Date.now(),
  ) {
    this.dayResetAt = now + DAY_MS
  }

  consume(cost = 1): void {
    const now = Date.now()
    this.prune(now)
    if (cost > this.perMinute || this.minuteUsage() + cost > this.perMinute) {
      throw new ProviderRateLimitError(60)
    }
    if (this.dayCount + cost > this.perDay) {
      throw new ProviderRateLimitError(3600)
    }
    this.minuteEvents.push({ at: now, cost })
    this.dayCount += cost
  }

  private prune(now: number): void {
    const cutoff = now - MINUTE_MS
    this.minuteEvents = this.minuteEvents.filter((event) => event.at > cutoff)
    if (now >= this.dayResetAt) {
      this.dayCount = 0
      this.dayResetAt = now + DAY_MS
    }
  }

  private minuteUsage(): number {
    return this.minuteEvents.reduce((total, event) => total + event.cost, 0)
  }
}
