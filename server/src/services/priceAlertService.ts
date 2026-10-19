import { randomUUID } from 'node:crypto'
import type { DatabaseConnection } from '../db/database.js'
import { NotFoundError, ValidationError } from '../lib/errors.js'
import {
  type AlertCondition,
  type AlertStatus,
} from './alertEvaluation.js'
import type { AlertEvaluationService } from './alertEvaluationService.js'
import type { NotificationService } from './notificationService.js'

/** Guards against unbounded rows per account. */
export const MAX_ALERTS_PER_USER = 200

export interface PriceAlert {
  id: string
  symbol: string
  name: string | null
  condition: AlertCondition
  threshold: number
  enabled: boolean
  status: AlertStatus
  triggeredAt: string | null
  lastCheckedAt: string | null
  lastPrice: number | null
  baselinePrice: number | null
  createdAt: string
  updatedAt: string
}

interface AlertRow {
  id: string
  symbol: string
  name: string | null
  condition: AlertCondition
  threshold: number
  enabled: number
  triggered_at: string | null
  last_checked_at: string | null
  last_price: number | null
  baseline_price: number | null
  created_at: string
  updated_at: string
}

export interface CreateAlertInput {
  symbol: string
  name?: string | null
  currency?: string | null
  exchange?: string | null
  condition: AlertCondition
  threshold: number
  enabled?: boolean
}

export interface UpdateAlertInput {
  condition?: AlertCondition
  threshold?: number
  enabled?: boolean
}

const SELECT_ALERT = `
  SELECT pa.id              AS id,
         pa.symbol          AS symbol,
         s.name             AS name,
         pa.condition       AS condition,
         pa.threshold       AS threshold,
         pa.enabled         AS enabled,
         pa.triggered_at    AS triggered_at,
         pa.last_checked_at AS last_checked_at,
         pa.last_price      AS last_price,
         pa.baseline_price  AS baseline_price,
         pa.created_at      AS created_at,
         pa.updated_at      AS updated_at
    FROM price_alerts pa
    LEFT JOIN stocks s ON s.symbol = pa.symbol
`

function toStatus(row: AlertRow): AlertStatus {
  if (!row.enabled) return 'disabled'
  return row.triggered_at ? 'triggered' : 'active'
}

function toPriceAlert(row: AlertRow): PriceAlert {
  return {
    id: row.id,
    symbol: row.symbol,
    name: row.name ?? null,
    condition: row.condition,
    threshold: row.threshold,
    enabled: Boolean(row.enabled),
    status: toStatus(row),
    triggeredAt: row.triggered_at ?? null,
    lastCheckedAt: row.last_checked_at ?? null,
    lastPrice: row.last_price ?? null,
    baselinePrice: row.baseline_price ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * Persists each user's price alerts. Isolation is enforced here: every
 * statement is scoped by `user_id`, and ownership always comes from the
 * authenticated session (see the route layer) — never from the request body.
 */
export class PriceAlertService {
  constructor(
    private readonly db: DatabaseConnection,
    private readonly evaluator: AlertEvaluationService,
    /** Optional: sends notification emails when an alert triggers. */
    private readonly notifications?: NotificationService,
  ) {}

  private findOwnedRow(userId: string, id: string): AlertRow | undefined {
    return this.db
      .prepare(`${SELECT_ALERT} WHERE pa.id = ? AND pa.user_id = ?`)
      .get(id, userId) as AlertRow | undefined
  }

  list(userId: string): PriceAlert[] {
    const rows = this.db
      .prepare(
        `${SELECT_ALERT} WHERE pa.user_id = ? ORDER BY pa.created_at DESC, pa.id DESC`,
      )
      .all(userId) as AlertRow[]
    return rows.map(toPriceAlert)
  }

  create(userId: string, input: CreateAlertInput): PriceAlert {
    const count = this.db
      .prepare('SELECT COUNT(*) AS count FROM price_alerts WHERE user_id = ?')
      .get(userId) as { count: number }
    if (count.count >= MAX_ALERTS_PER_USER) {
      throw new ValidationError(
        `You have reached the limit of ${MAX_ALERTS_PER_USER} alerts. Delete one before creating another.`,
      )
    }

    const now = new Date().toISOString()
    const id = randomUUID()
    const enabled = input.enabled === false ? 0 : 1

    const run = this.db.transaction(() => {
      // Cache the stock metadata the client already has so alerts can display
      // a company name without an extra provider call.
      this.db
        .prepare(
          `INSERT INTO stocks (symbol, name, currency, exchange, created_at, updated_at)
           VALUES (@symbol, @name, @currency, @exchange, @now, @now)
           ON CONFLICT (symbol) DO UPDATE SET
             name = COALESCE(excluded.name, stocks.name),
             currency = COALESCE(excluded.currency, stocks.currency),
             exchange = COALESCE(excluded.exchange, stocks.exchange),
             updated_at = excluded.updated_at`,
        )
        .run({
          symbol: input.symbol,
          name: input.name ?? null,
          currency: input.currency ?? null,
          exchange: input.exchange ?? null,
          now,
        })

      this.db
        .prepare(
          `INSERT INTO price_alerts
             (id, user_id, symbol, condition, threshold, enabled,
              triggered_at, last_checked_at, last_price, baseline_price,
              created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, ?, ?)`,
        )
        .run(
          id,
          userId,
          input.symbol,
          input.condition,
          input.threshold,
          enabled,
          now,
          now,
        )
    })
    run()

    return toPriceAlert(this.findOwnedRow(userId, id)!)
  }

  update(userId: string, id: string, changes: UpdateAlertInput): PriceAlert {
    const existing = this.findOwnedRow(userId, id)
    if (!existing) {
      throw new NotFoundError('That alert does not exist.')
    }

    const now = new Date().toISOString()
    const assignments = ['updated_at = @updatedAt']
    const params: Record<string, unknown> = { id, userId, updatedAt: now }

    const rearm =
      changes.condition !== undefined ||
      changes.threshold !== undefined ||
      changes.enabled === true

    if (changes.condition !== undefined) {
      assignments.push('condition = @condition')
      params.condition = changes.condition
    }
    if (changes.threshold !== undefined) {
      assignments.push('threshold = @threshold')
      params.threshold = changes.threshold
    }
    if (changes.enabled !== undefined) {
      assignments.push('enabled = @enabled')
      params.enabled = changes.enabled ? 1 : 0
    }
    // Re-arm a previously triggered alert whenever its rule or enabled state
    // changes, so it can trigger again.
    if (rearm) {
      assignments.push('triggered_at = NULL')
    }

    this.db
      .prepare(
        `UPDATE price_alerts SET ${assignments.join(', ')}
          WHERE id = @id AND user_id = @userId`,
      )
      .run(params)

    return toPriceAlert(this.findOwnedRow(userId, id)!)
  }

  remove(userId: string, id: string): boolean {
    const result = this.db
      .prepare('DELETE FROM price_alerts WHERE id = ? AND user_id = ?')
      .run(id, userId)
    if (result.changes === 0) {
      throw new NotFoundError('That alert does not exist.')
    }
    return true
  }

  /**
   * Evaluates every enabled, not-yet-triggered alert for the user against the
   * latest prices and persists the outcome. A provider failure for one symbol
   * is skipped so it cannot block the rest of the batch.
   *
   * When an alert transitions to triggered, a notification row is recorded
   * first (idempotent per trigger) and the email send is attempted inline;
   * send failures are recorded on the notification and never fail the request.
   */
  async evaluate(userId: string, signal?: AbortSignal): Promise<PriceAlert[]> {
    const rows = this.db
      .prepare(
        `${SELECT_ALERT}
          WHERE pa.user_id = ? AND pa.enabled = 1 AND pa.triggered_at IS NULL
          ORDER BY pa.created_at ASC`,
      )
      .all(userId) as AlertRow[]

    const touch = this.db.prepare(
      `UPDATE price_alerts
          SET last_checked_at = @checkedAt,
              last_price = @lastPrice,
              baseline_price = @baselinePrice,
              updated_at = @checkedAt
        WHERE id = @id AND user_id = @userId`,
    )

    // Guarded by `triggered_at IS NULL` so two concurrent evaluations can
    // never both fire a notification for the same transition.
    const trigger = this.db.prepare(
      `UPDATE price_alerts
          SET last_checked_at = @checkedAt,
              last_price = @lastPrice,
              baseline_price = @baselinePrice,
              triggered_at = @checkedAt,
              updated_at = @checkedAt
        WHERE id = @id AND user_id = @userId AND triggered_at IS NULL`,
    )

    const pendingNotifications: string[] = []

    for (const row of rows) {
      let evaluation
      try {
        evaluation = await this.evaluator.evaluate(
          {
            symbol: row.symbol,
            condition: row.condition,
            threshold: row.threshold,
          },
          signal,
        )
      } catch {
        // Leave the alert untouched this pass; a later check can retry.
        continue
      }

      const checkedAt = new Date().toISOString()
      if (evaluation.triggered) {
        const won = trigger.run({
          id: row.id,
          userId,
          checkedAt,
          lastPrice: evaluation.latestPrice,
          baselinePrice: evaluation.baselinePrice,
        })
        if (won.changes !== 1) continue

        const notificationId = this.notifications?.recordTrigger({
          userId,
          alertId: row.id,
          symbol: row.symbol,
          companyName: row.name,
          condition: row.condition,
          threshold: row.threshold,
          triggerPrice: evaluation.latestPrice,
          changePercent: evaluation.changePercent,
          triggeredAt: checkedAt,
        })
        if (notificationId) pendingNotifications.push(notificationId)
      } else {
        touch.run({
          id: row.id,
          userId,
          checkedAt,
          lastPrice: evaluation.latestPrice,
          baselinePrice: evaluation.baselinePrice,
        })
      }
    }

    for (const notificationId of pendingNotifications) {
      await this.notifications?.sendPending(notificationId)
    }

    return this.list(userId)
  }
}
