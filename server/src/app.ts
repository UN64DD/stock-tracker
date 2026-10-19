import cors from 'cors'
import express, { type NextFunction, type Request, type Response } from 'express'
import { loadConfig, type AppConfig } from './config.js'
import { openDatabase, type DatabaseConnection } from './db/database.js'
import { isAppError, ProviderPlanRestrictedError } from './lib/errors.js'
import { rateLimit } from './lib/rateLimit.js'
import { createAlertsRouter } from './routes/alerts.js'
import { createAuthRouter } from './routes/auth.js'
import { createHealthRouter } from './routes/health.js'
import { createNewsRouter } from './routes/news.js'
import { createStocksRouter } from './routes/stocks.js'
import { createWatchlistRouter } from './routes/watchlist.js'
import { AlertEvaluationService } from './services/alertEvaluationService.js'
import { AuthService } from './services/authService.js'
import {
  createMarketDataService,
  createNewsService,
  type MarketDataService,
  type NewsService,
} from './services/index.js'
import { PriceAlertService } from './services/priceAlertService.js'
import { WatchlistService } from './services/watchlistService.js'

export interface CreateAppOptions {
  config?: AppConfig
  service?: MarketDataService
  newsService?: NewsService
  /** Inject a database (tests use an in-memory instance); otherwise one is opened. */
  database?: DatabaseConnection
}

const PUBLIC_RATE_LIMIT = { windowMs: 60_000, max: 120 }
const AUTH_RATE_LIMIT = { windowMs: 60_000, max: 30 }

/**
 * Provider-sourced error text is never echoed to clients verbatim, so that a
 * provider response (which could contain request URLs or credentials) can
 * never leak through an error body.
 */
const SAFE_PROVIDER_MESSAGES: Record<string, string> = {
  provider_auth_error: "The market data provider rejected the server's credentials.",
  provider_timeout: 'The market data provider did not respond in time. Please try again.',
  provider_rate_limited: 'The market data provider rate limit was reached. Please try again shortly.',
  provider_plan_restricted: 'This data is not available on the configured market data plan.',
  provider_unavailable: 'The requested data is not available on the configured market data plan.',
  provider_error: 'The market data provider is temporarily unavailable.',
}

export function createApp(options: CreateAppOptions = {}): express.Express {
  const config = options.config ?? loadConfig()
  const service = options.service ?? createMarketDataService(config)
  const newsService = options.newsService ?? createNewsService(config)
  const database = options.database ?? openDatabase({ databasePath: config.databasePath })
  const authService = new AuthService(database, {
    sessionTtlSeconds: config.sessionTtlSeconds,
  })
  const watchlistService = new WatchlistService(database)
  const alertService = new PriceAlertService(
    database,
    new AlertEvaluationService(service),
  )

  const app = express()
  app.disable('x-powered-by')
  // `credentials` allows the HttpOnly session cookie to flow on same-origin and
  // explicitly-allowed cross-origin requests. Configure CORS_ORIGIN precisely
  // when the API is served from a different origin than the app.
  app.use(cors({ origin: config.corsOrigin, credentials: true }))
  app.use(express.json())

  app.use('/api', rateLimit(PUBLIC_RATE_LIMIT))
  app.use('/api/auth', rateLimit(AUTH_RATE_LIMIT))
  app.use('/api/health', createHealthRouter(service))
  app.use('/api/stocks', createStocksRouter(service))
  app.use('/api/news', createNewsRouter(newsService))
  app.use('/api/auth', createAuthRouter(authService, config))
  app.use('/api/watchlist', createWatchlistRouter(watchlistService, authService, config))
  app.use('/api/alerts', createAlertsRouter(alertService, authService, config))

  app.use('/api', (_req, res) => {
    res.status(404).json({
      error: { code: 'not_found', message: 'The requested API route does not exist.' },
    })
  })

  app.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      next(error)
      return
    }

    if (error instanceof ProviderPlanRestrictedError) {
      res.status(502).json({
        error: {
          code: 'provider_unavailable',
          message: 'This data is not available on the configured market data plan.',
        },
      })
      return
    }

    if (isAppError(error)) {
      if (error.retryAfterSeconds) {
        res.setHeader('Retry-After', String(error.retryAfterSeconds))
      }
      const safeMessage = SAFE_PROVIDER_MESSAGES[error.code] ?? error.message
      res.status(error.status).json({
        error: {
          code: error.code,
          message: safeMessage,
          ...(error.code === 'validation_error' && error.details !== undefined
            ? { details: error.details }
            : {}),
        },
      })
      return
    }

    console.error('[stock-tracker] Unhandled server error:', error)
    res.status(500).json({
      error: { code: 'internal_error', message: 'An unexpected server error occurred.' },
    })
  })

  return app
}
