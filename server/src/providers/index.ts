import type { AppConfig } from '../config.js'
import { FinnhubNewsProvider } from './finnhubNews.js'
import { ResendEmailProvider } from './resendEmailProvider.js'
import { TwelveDataProvider } from './twelvedata.js'
import type { EmailProvider } from './emailTypes.js'
import type { NewsProvider } from './newsTypes.js'
import type { StockProvider } from './types.js'

export function createProvider(config: AppConfig): StockProvider {
  switch (config.provider) {
    case 'twelvedata':
      return new TwelveDataProvider(config.stockApiKey, config.requestTimeoutMs)
    default:
      throw new Error(`Unsupported STOCK_DATA_PROVIDER: "${config.provider}".`)
  }
}

export function createNewsProvider(config: AppConfig): NewsProvider {
  switch (config.newsProvider) {
    case 'finnhub':
      return new FinnhubNewsProvider(config.newsApiKey, config.requestTimeoutMs)
    default:
      throw new Error(`Unsupported NEWS_DATA_PROVIDER: "${config.newsProvider}".`)
  }
}

/**
 * Email transport for alert notifications. `resend` works via REST without an
 * SDK; `none` (or an unset API key) yields an unconfigured provider whose sends
 * fail with a clear `not_configured` error that is recorded on the notification
 * row — sending is never silently faked.
 */
export function createEmailProvider(config: AppConfig): EmailProvider {
  switch (config.emailProvider) {
    case 'resend':
      return new ResendEmailProvider(config.emailApiKey, config.emailTimeoutMs)
    case 'none':
      return new ResendEmailProvider(undefined, config.emailTimeoutMs)
    default:
      throw new Error(`Unsupported EMAIL_PROVIDER: "${config.emailProvider}".`)
  }
}

export type { EmailProvider, EmailMessage, EmailSendResult } from './emailTypes.js'
export { EmailSendError } from './emailTypes.js'
export type { NewsProvider } from './newsTypes.js'
export type { NormalizedNewsArticle } from './newsTypes.js'
