import type { ChartRange } from '../lib/validate.js'
import type { MarketDataService } from './marketDataService.js'
import {
  evaluateAlert,
  isPercentCondition,
  selectWindowPrices,
  type AlertCondition,
  type AlertEvaluationResult,
} from './alertEvaluation.js'

/**
 * The percentage-change window used for `percent_increase` / `percent_decrease`
 * alerts. `1D` is supported by the free provider plan and resolves to intraday
 * 5-minute bars; the baseline is the first valid observation of that window
 * (the session open) and the latest price is the last valid observation.
 */
export const PERCENT_ALERT_RANGE: ChartRange = '1D'

export interface EvaluatableAlert {
  symbol: string
  condition: AlertCondition
  threshold: number
}

/**
 * Turns a stored alert plus live market data into an `AlertEvaluationResult`.
 * Absolute price alerts use the latest quote; percentage alerts use the 1-day
 * historical window so the baseline and window are explicit and reproducible.
 * Provider errors bubble up so the caller can skip the alert for this pass.
 */
export class AlertEvaluationService {
  constructor(private readonly market: MarketDataService) {}

  async evaluate(
    alert: EvaluatableAlert,
    signal?: AbortSignal,
  ): Promise<AlertEvaluationResult> {
    if (isPercentCondition(alert.condition)) {
      const result = await this.market.history(
        alert.symbol,
        PERCENT_ALERT_RANGE,
        signal,
      )
      const { baselinePrice, latestPrice } = selectWindowPrices(
        result.data?.points ?? [],
      )
      return evaluateAlert({
        condition: alert.condition,
        threshold: alert.threshold,
        latestPrice,
        baselinePrice,
      })
    }

    const quote = await this.market.quote(alert.symbol, signal)
    return evaluateAlert({
      condition: alert.condition,
      threshold: alert.threshold,
      latestPrice: quote.data?.price ?? null,
    })
  }
}
