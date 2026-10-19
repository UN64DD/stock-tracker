import { isPercentCondition, type AlertCondition } from './alertEvaluation.js'

/**
 * Pure template rendering for alert-trigger notification emails. No provider,
 * database, or configuration is touched here, so rendering is fully
 * unit-testable. Every interpolated value is HTML-escaped; the plain-text
 * version mirrors the HTML so no client is left without content.
 */

export const ALERT_CONDITION_EMAIL_LABELS: Record<AlertCondition, string> = {
  price_above: 'Price rose to or above your target',
  price_below: 'Price fell to or below your target',
  percent_increase: 'Price rose by your chosen percentage',
  percent_decrease: 'Price fell by your chosen percentage',
}

export interface AlertTriggerEmailInput {
  recipientName: string | null
  symbol: string
  companyName: string | null
  condition: AlertCondition
  threshold: number
  /** Price at the moment the alert triggered (null when unavailable). */
  triggerPrice: number | null
  /** Session change percentage, present for percentage conditions only. */
  changePercent: number | null
  /** ISO timestamp of the trigger. */
  triggeredAt: string
  /** Absolute URL of the stock detail page. */
  stockUrl: string
  /** Absolute URL of the alerts dashboard. */
  alertsUrl: string
}

export interface RenderedEmail {
  subject: string
  text: string
  html: string
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function formatPrice(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'Unavailable'
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''
  return `${sign}${Math.abs(value).toFixed(2)}%`
}

function formatThreshold(condition: AlertCondition, threshold: number): string {
  return isPercentCondition(condition)
    ? `${threshold.toFixed(2)}%`
    : formatPrice(threshold)
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return `${date.toISOString().replace('T', ' ').slice(0, 19)} UTC`
}

function greeting(input: AlertTriggerEmailInput): string {
  if (input.recipientName?.trim()) return `Hi ${input.recipientName.trim()},`
  return 'Hi there,'
}

function headline(input: AlertTriggerEmailInput): string {
  return input.companyName
    ? `${input.symbol} (${input.companyName}) triggered your price alert`
    : `${input.symbol} triggered your price alert`
}

/** Human-readable one-line summary used in the text body and email subject. */
function summaryLine(input: AlertTriggerEmailInput): string {
  const price = formatPrice(input.triggerPrice)
  return `${ALERT_CONDITION_EMAIL_LABELS[input.condition]} — triggered at ${price}.`
}

export function renderAlertTriggerEmail(
  input: AlertTriggerEmailInput,
): RenderedEmail {
  const subject = `Price alert triggered: ${input.symbol}`
  const rows: Array<[string, string]> = [
    ['Stock', input.companyName ? `${input.symbol} — ${input.companyName}` : input.symbol],
    ['Condition', ALERT_CONDITION_EMAIL_LABELS[input.condition]],
    ['Your threshold', formatThreshold(input.condition, input.threshold)],
    ['Triggering price', formatPrice(input.triggerPrice)],
  ]
  if (isPercentCondition(input.condition) && input.changePercent !== null) {
    rows.push(['Session change', formatPercent(input.changePercent)])
  }
  rows.push(['Triggered at', formatTimestamp(input.triggeredAt)])

  const text = [
    greeting(input),
    '',
    headline(input),
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    `View ${input.symbol}: ${input.stockUrl}`,
    `Manage your alerts: ${input.alertsUrl}`,
    '',
    'This email was sent because you have price-alert emails enabled in your',
    'Stock Tracker account. You can turn them off in Settings → Notifications.',
    'It was sent when your alert triggered — replies to this address are not',
    'monitored.',
  ].join('\n')

  const rowHtml = rows
    .map(
      ([label, value]) => `
            <tr>
              <td style="padding:8px 0;color:#6b7280;font-size:13px;border-bottom:1px solid #f3f4f6;">${escapeHtml(label)}</td>
              <td style="padding:8px 0 8px 16px;color:#111827;font-size:13px;border-bottom:1px solid #f3f4f6;text-align:right;">${escapeHtml(value)}</td>
            </tr>`,
    )
    .join('')

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f9fafb;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
            <tr>
              <td style="background:#111827;padding:16px 24px;">
                <span style="color:#ffffff;font-size:16px;font-weight:600;letter-spacing:0.02em;">Stock Tracker</span>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 24px 8px 24px;">
                <h1 style="margin:0;font-size:18px;line-height:1.4;color:#111827;">${escapeHtml(headline(input))}</h1>
                <p style="margin:8px 0 0 0;font-size:14px;color:#4b5563;">${escapeHtml(summaryLine(input))}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #f3f4f6;border-radius:8px;">
                  <tr><td colspan="2" style="padding:8px 12px 0 12px;"></td></tr>
                  ${rowHtml}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 24px 24px 24px;">
                <a href="${escapeHtml(input.stockUrl)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 18px;border-radius:8px;">View ${escapeHtml(input.symbol)}</a>
                <a href="${escapeHtml(input.alertsUrl)}" style="display:inline-block;margin-left:8px;color:#2563eb;text-decoration:none;font-size:14px;font-weight:500;padding:10px 8px;">Manage alerts</a>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px;border-top:1px solid #f3f4f6;">
                <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
                  Sent by Stock Tracker because price-alert emails are enabled on your account.
                  Turn them off anytime in Settings &rarr; Notifications. Replies to this address are not monitored.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

  return { subject, text, html }
}
