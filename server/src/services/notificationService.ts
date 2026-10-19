import { randomUUID } from 'node:crypto'
import type { DatabaseConnection } from '../db/database.js'
import { ConflictError, NotFoundError } from '../lib/errors.js'
import type { EmailProvider } from '../providers/emailTypes.js'
import { EmailSendError } from '../providers/emailTypes.js'
import { renderAlertTriggerEmail } from './emailTemplate.js'
import type { AlertCondition } from './alertEvaluation.js'

export type NotificationStatus = 'pending' | 'accepted' | 'delivered' | 'failed'

export interface AlertNotification {
  id: string
  alertId: string | null
  recipientEmail: string
  symbol: string
  companyName: string | null
  condition: AlertCondition
  threshold: number
  triggerPrice: number | null
  changePercent: number | null
  triggeredAt: string
  status: NotificationStatus
  providerMessageId: string | null
  errorCode: string | null
  errorMessage: string | null
  attempts: number
  createdAt: string
  lastAttemptAt: string | null
  acceptedAt: string | null
  deliveredAt: string | null
}

interface NotificationRow {
  id: string
  alert_id: string | null
  user_id: string
  recipient_email: string
  symbol: string
  company_name: string | null
  condition: AlertCondition
  threshold: number
  trigger_price: number | null
  change_percent: number | null
  triggered_at: string
  status: NotificationStatus
  provider_message_id: string | null
  error_code: string | null
  error_message: string | null
  attempts: number
  created_at: string
  last_attempt_at: string | null
  accepted_at: string | null
  delivered_at: string | null
}

export interface RecordTriggerInput {
  userId: string
  alertId: string
  symbol: string
  companyName: string | null
  condition: AlertCondition
  threshold: number
  triggerPrice: number | null
  changePercent: number | null
  triggeredAt: string
}

export interface NotificationServiceOptions {
  /** Verified from-address passed to the provider verbatim. */
  emailFrom: string
  /** Public app origin used for links inside emails. */
  appBaseUrl: string
  /** History rows per page. */
  historyLimit?: number
}

export interface WebhookEvent {
  type?: unknown
  data?: { email_id?: unknown }
}

const SELECT_NOTIFICATION = `
  SELECT id, alert_id, user_id, recipient_email, symbol, company_name,
         condition, threshold, trigger_price, change_percent, triggered_at,
         status, provider_message_id, error_code, error_message, attempts,
         created_at, last_attempt_at, accepted_at, delivered_at
    FROM alert_notifications
`

function toNotification(row: NotificationRow): AlertNotification {
  return {
    id: row.id,
    alertId: row.alert_id,
    recipientEmail: row.recipient_email,
    symbol: row.symbol,
    companyName: row.company_name,
    condition: row.condition,
    threshold: row.threshold,
    triggerPrice: row.trigger_price,
    changePercent: row.change_percent,
    triggeredAt: row.triggered_at,
    status: row.status,
    providerMessageId: row.provider_message_id,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    attempts: row.attempts,
    createdAt: row.created_at,
    lastAttemptAt: row.last_attempt_at,
    acceptedAt: row.accepted_at,
    deliveredAt: row.delivered_at,
  }
}

/**
 * Owns the alert-notification lifecycle: recording a trigger (idempotently),
 * sending through the email provider, retrying failed sends, and applying
 * signed webhook events. There is no queue or background worker — sends happen
 * inline when an alert triggers or when the user retries, which is enough at
 * this scale and keeps the failure modes visible.
 *
 * The notification row is written *before* the provider send is attempted, so a
 * crash mid-send can never produce a duplicate for the same trigger; the
 * `(alert_id, triggered_at)` unique index is the hard backstop. Statuses
 * distinguish `accepted` (provider accepted the request) from `delivered`
 * (webhook-confirmed); a send attempt is never recorded as delivered.
 */
export class NotificationService {
  private readonly historyLimit: number

  constructor(
    private readonly db: DatabaseConnection,
    private readonly email: EmailProvider,
    private readonly options: NotificationServiceOptions,
  ) {
    this.historyLimit = options.historyLimit ?? 50
  }

  /** True when the server has email credentials and can attempt sends. */
  get emailConfigured(): boolean {
    return this.email.configured
  }

  /** Per-user switch; defaults to enabled (migration default). */
  priceAlertEmailsEnabled(userId: string): boolean {
    const row = this.db
      .prepare('SELECT notify_price_alert_emails AS enabled FROM users WHERE id = ?')
      .get(userId) as { enabled: number } | undefined
    return row ? Boolean(row.enabled) : false
  }

  setPriceAlertEmails(userId: string, enabled: boolean): void {
    this.db
      .prepare('UPDATE users SET notify_price_alert_emails = ? WHERE id = ?')
      .run(enabled ? 1 : 0, userId)
  }

  stockUrlFor(symbol: string): string {
    return `${this.options.appBaseUrl}/stocks/${encodeURIComponent(symbol)}`
  }

  alertsUrlFor(): string {
    return `${this.options.appBaseUrl}/alerts`
  }

  /**
   * Records a pending notification for a trigger transition and returns its id
   * when a send should follow. Returns `null` — meaning "no email" — when the
   * user has disabled price-alert emails, the user no longer exists, or the
   * same (alert, triggered_at) was already recorded (idempotent replay).
   */
  recordTrigger(input: RecordTriggerInput): string | null {
    const user = this.db
      .prepare(
        'SELECT email, notify_price_alert_emails AS enabled FROM users WHERE id = ?',
      )
      .get(input.userId) as
      | { email: string; enabled: number }
      | undefined
    if (!user || !user.enabled) return null

    const id = randomUUID()
    const result = this.db
      .prepare(
        `INSERT INTO alert_notifications
           (id, alert_id, user_id, recipient_email, symbol, company_name,
            condition, threshold, trigger_price, change_percent, triggered_at,
            status, provider_message_id, error_code, error_message, attempts,
            created_at, last_attempt_at, accepted_at, delivered_at)
         VALUES (@id, @alertId, @userId, @recipientEmail, @symbol, @companyName,
                 @condition, @threshold, @triggerPrice, @changePercent, @triggeredAt,
                 'pending', NULL, NULL, NULL, 0, @now, NULL, NULL, NULL)`,
      )
      .run({
        id,
        alertId: input.alertId,
        userId: input.userId,
        recipientEmail: user.email,
        symbol: input.symbol,
        companyName: input.companyName,
        condition: input.condition,
        threshold: input.threshold,
        triggerPrice: input.triggerPrice,
        changePercent: input.changePercent,
        triggeredAt: input.triggeredAt,
        now: new Date().toISOString(),
      })
    // Unique (alert_id, triggered_at) — a concurrent replay inserts nothing.
    return result.changes === 1 ? id : null
  }

  /**
   * Attempts the provider send for a pending notification and records the
   * outcome. Never throws: provider failures, rate limits and rejected
   * recipients are recorded as `failed` with a safe message so the triggering
   * alert evaluation is never blocked by email delivery.
   */
  async sendPending(notificationId: string): Promise<void> {
    const row = this.db
      .prepare(`${SELECT_NOTIFICATION} WHERE id = ?`)
      .get(notificationId) as NotificationRow | undefined
    if (!row || row.status !== 'pending') return

    const now = new Date().toISOString()
    this.db
      .prepare(
        `UPDATE alert_notifications
            SET attempts = attempts + 1, last_attempt_at = @now
          WHERE id = @id`,
      )
      .run({ id: notificationId, now })

    const displayName =
      (
        this.db
          .prepare('SELECT display_name AS name FROM users WHERE id = ?')
          .get(row.user_id) as { name: string | null } | undefined
      )?.name ?? null

    const rendered = renderAlertTriggerEmail({
      recipientName: displayName,
      symbol: row.symbol,
      companyName: row.company_name,
      condition: row.condition,
      threshold: row.threshold,
      triggerPrice: row.trigger_price,
      changePercent: row.change_percent,
      triggeredAt: row.triggered_at,
      stockUrl: this.stockUrlFor(row.symbol),
      alertsUrl: this.alertsUrlFor(),
    })

    try {
      const result = await this.email.send({
        to: row.recipient_email,
        from: this.options.emailFrom,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      })
      this.db
        .prepare(
          `UPDATE alert_notifications
              SET status = 'accepted', provider_message_id = @messageId,
                  accepted_at = @now, error_code = NULL, error_message = NULL
            WHERE id = @id`,
        )
        .run({ id: notificationId, messageId: result.id, now: new Date().toISOString() })
    } catch (error) {
      // Messages here come from EmailSendError (written by this codebase) —
      // provider error text and credentials are never stored.
      const code = error instanceof EmailSendError ? error.kind : 'provider_error'
      const message =
        error instanceof Error ? error.message : 'The email send failed unexpectedly.'
      this.db
        .prepare(
          `UPDATE alert_notifications
              SET status = 'failed', error_code = @code, error_message = @message
            WHERE id = @id`,
        )
        .run({ id: notificationId, code, message })
    }
  }

  list(userId: string): AlertNotification[] {
    const rows = this.db
      .prepare(
        `${SELECT_NOTIFICATION}
          WHERE user_id = ?
          ORDER BY created_at DESC, id DESC
          LIMIT ?`,
      )
      .all(userId, this.historyLimit) as NotificationRow[]
    return rows.map(toNotification)
  }

  getOwned(userId: string, id: string): AlertNotification {
    const row = this.db
      .prepare(`${SELECT_NOTIFICATION} WHERE id = ? AND user_id = ?`)
      .get(id, userId) as NotificationRow | undefined
    if (!row) {
      throw new NotFoundError('That notification does not exist.')
    }
    return toNotification(row)
  }

  /**
   * Re-attempts a failed notification for its original recipient. Only failed
   * rows can be resent, and the same row is reused (attempts increments), so
   * history stays one-entry-per-trigger.
   */
  async resend(userId: string, id: string): Promise<AlertNotification> {
    const existing = this.getOwned(userId, id)
    if (existing.status !== 'failed') {
      throw new ConflictError('Only failed notifications can be resent.')
    }
    this.db
      .prepare(
        `UPDATE alert_notifications
            SET status = 'pending', error_code = NULL, error_message = NULL,
                provider_message_id = NULL, accepted_at = NULL, delivered_at = NULL
          WHERE id = ?`,
      )
      .run(id)
    await this.sendPending(id)
    return this.getOwned(userId, id)
  }

  /**
   * Applies a verified provider webhook event. Matching is by the provider
   * message id stamped at accept time. `email.delivered` promotes
   * `accepted` → `delivered`; bounce/failure events mark the row `failed`.
   * Returns true when a row changed.
   */
  applyWebhookEvent(event: WebhookEvent): boolean {
    const type = typeof event?.type === 'string' ? event.type : ''
    const emailId =
      typeof event?.data?.email_id === 'string' ? event.data.email_id : ''
    if (!emailId) return false

    const now = new Date().toISOString()
    if (type === 'email.delivered') {
      const result = this.db
        .prepare(
          `UPDATE alert_notifications
              SET status = 'delivered', delivered_at = @now
            WHERE provider_message_id = @emailId
              AND status IN ('pending', 'accepted')`,
        )
        .run({ emailId, now })
      return result.changes > 0
    }

    if (type === 'email.bounced' || type === 'email.complained' || type === 'email.failed') {
      const result = this.db
        .prepare(
          `UPDATE alert_notifications
              SET status = 'failed', error_code = @code, error_message = @message
            WHERE provider_message_id = @emailId
              AND status IN ('pending', 'accepted')`,
        )
        .run({
          emailId,
          code: type.replace('email.', ''),
          message: `The email provider reported this message as ${type.replace('email.', '')}.`,
        })
      return result.changes > 0
    }

    return false
  }
}
