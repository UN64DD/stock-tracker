import { fetchJson } from '../lib/http.js'
import { ProviderError, UpstreamTimeoutError } from '../lib/errors.js'
import {
  EmailSendError,
  type EmailMessage,
  type EmailProvider,
  type EmailSendResult,
} from './emailTypes.js'

const RESEND_API_URL = 'https://api.resend.com/emails'
const USER_AGENT = 'stock-tracker/1.0'

interface ResendErrorResponse {
  message?: string
  name?: string
}

interface ResendSuccessResponse {
  id?: string
}

/**
 * Maps provider HTTP status codes to safe, typed failures. The raw provider
 * error text is deliberately *not* forwarded — only a fixed message is stored
 * on the notification row, so provider responses can never leak credentials or
 * internal details into history.
 */
function mapHttpError(status: number): EmailSendError {
  if (status === 401 || status === 403) {
    return new EmailSendError(
      'provider_error',
      "The email provider rejected the server's credentials.",
    )
  }
  if (status === 429) {
    return new EmailSendError(
      'rate_limited',
      'The email provider rate limit was reached. The send can be retried later.',
    )
  }
  if (status === 422 || status === 400) {
    return new EmailSendError(
      'invalid_recipient',
      'The email provider rejected the recipient address or message.',
    )
  }
  return new EmailSendError(
    'provider_error',
    'The email provider returned an error while sending.',
  )
}

/**
 * Resend transactional email over its REST API using plain `fetch`, so no SDK
 * dependency is added (matching the fetch-based stock/news providers).
 *
 * Free tier (current docs): 100 emails/day, 3,000/month, 10 requests/second,
 * 1 webhook endpoint; webhooks are available on all plans. A `User-Agent`
 * header is required by the API. A `200` response means the provider *accepted*
 * the message — it is not a delivery guarantee (see the webhook handler).
 */
export class ResendEmailProvider implements EmailProvider {
  readonly name = 'resend'

  constructor(
    private readonly apiKey: string | undefined,
    private readonly timeoutMs: number,
  ) {}

  get configured(): boolean {
    return Boolean(this.apiKey)
  }

  async send(message: EmailMessage, signal?: AbortSignal): Promise<EmailSendResult> {
    if (!this.apiKey) {
      throw new EmailSendError(
        'not_configured',
        'Email sending is not configured on the server (RESEND_API_KEY is unset).',
      )
    }

    let response
    try {
      response = await fetchJson<ResendSuccessResponse | ResendErrorResponse>(
        RESEND_API_URL,
        {
          timeoutMs: this.timeoutMs,
          method: 'POST',
          headers: {
            authorization: `Bearer ${this.apiKey}`,
            'content-type': 'application/json',
            'user-agent': USER_AGENT,
          },
          body: JSON.stringify({
            from: message.from,
            to: [message.to],
            subject: message.subject,
            html: message.html,
            text: message.text,
          }),
          signal,
        },
      )
    } catch (error) {
      if (error instanceof UpstreamTimeoutError) {
        throw new EmailSendError(
          'provider_error',
          'The email provider did not respond in time.',
        )
      }
      if (error instanceof ProviderError || error instanceof Error) {
        // Network / malformed-response failures; never forward raw text.
        throw new EmailSendError(
          'provider_error',
          'The email provider is temporarily unavailable.',
        )
      }
      throw new EmailSendError(
        'provider_error',
        'The email send failed unexpectedly.',
      )
    }

    if (!response.ok) {
      throw mapHttpError(response.status)
    }

    const id =
      typeof (response.data as ResendSuccessResponse | null)?.id === 'string'
        ? ((response.data as ResendSuccessResponse).id as string)
        : null
    return { id }
  }
}
