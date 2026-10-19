/**
 * Provider-independent email shapes, mirroring the stock/news provider split:
 * the notification service never touches vendor-specific fields.
 */

export interface EmailMessage {
  to: string
  from: string
  subject: string
  /** HTML body; always paired with a plain-text fallback. */
  html: string
  /** Plain-text fallback for clients that do not render HTML. */
  text: string
}

export interface EmailSendResult {
  /** Provider message id, when one is returned. Used for webhook correlation. */
  id: string | null
}

export type EmailSendErrorKind =
  /** The server has no email credentials configured. */
  | 'not_configured'
  /** Provider rate limit (HTTP 429). */
  | 'rate_limited'
  /** Provider rejected the recipient address (e.g. HTTP 422 / suppressed). */
  | 'invalid_recipient'
  /** Any other provider/network failure, including bad credentials. */
  | 'provider_error'

/**
 * Send failure with a safe, human-readable message. Messages are written by
 * this codebase (or reduced to a short provider summary) and are stored on the
 * notification row — they never contain API keys or request credentials.
 */
export class EmailSendError extends Error {
  readonly kind: EmailSendErrorKind

  constructor(kind: EmailSendErrorKind, message: string) {
    super(message)
    this.name = 'EmailSendError'
    this.kind = kind
  }
}

export interface EmailProvider {
  readonly name: string
  /** True when credentials are present and sending can be attempted. */
  readonly configured: boolean
  send(message: EmailMessage, signal?: AbortSignal): Promise<EmailSendResult>
}
