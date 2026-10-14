import { Router, type Response } from 'express'
import { asyncHandler, requestSignal } from '../lib/asyncHandler.js'
import { ConfigurationError } from '../lib/errors.js'
import {
  normalizeSymbol,
  parseMarketNewsCategory,
  parsePage,
  parsePageSize,
} from '../lib/validate.js'
import type { CacheResult } from '../services/marketDataService.js'
import type { NewsFeed, NewsService } from '../services/newsService.js'

const MAX_PAGE_SIZE = 24

function sendNewsResult(res: Response, service: NewsService, result: CacheResult<NewsFeed>): void {
  const info = service.getProviderInfo()
  res.setHeader('X-Data-Cache', result.cached ? (result.stale ? 'stale' : 'hit') : 'miss')
  res.json({
    data: result.data,
    meta: {
      provider: info.name,
      cached: result.cached,
      stale: result.stale,
      fetchedAt: new Date(result.fetchedAt).toISOString(),
      dataStatus: result.stale ? 'delayed' : 'real-time',
      dataStatusNote: info.note,
    },
  })
}

function ensureConfigured(service: NewsService): void {
  if (!service.getProviderInfo().configured) {
    throw new ConfigurationError(
      'News is not configured on the server. Set FINNHUB_API_KEY in server/.env to enable it.',
    )
  }
}

export function createNewsRouter(service: NewsService): Router {
  const router = Router()

  router.get(
    '/market',
    asyncHandler(async (req, res) => {
      ensureConfigured(service)
      const category = parseMarketNewsCategory(
        typeof req.query.category === 'string' ? req.query.category : undefined,
      )
      const page = parsePage(req.query.page)
      const pageSize = parsePageSize(req.query.pageSize, service.defaultPageSize, MAX_PAGE_SIZE)

      const result = await service.marketNews(category, page, pageSize, requestSignal(res))
      sendNewsResult(res, service, result)
    }),
  )

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      ensureConfigured(service)
      const symbol = normalizeSymbol(
        typeof req.query.symbol === 'string' ? req.query.symbol : undefined,
      )
      const page = parsePage(req.query.page)
      const pageSize = parsePageSize(req.query.pageSize, service.defaultPageSize, MAX_PAGE_SIZE)

      const result = await service.companyNews(symbol, page, pageSize, requestSignal(res))
      sendNewsResult(res, service, result)
    }),
  )

  return router
}
