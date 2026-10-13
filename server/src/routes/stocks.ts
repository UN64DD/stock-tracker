import { Router, type Response } from 'express'
import { asyncHandler, requestSignal } from '../lib/asyncHandler.js'
import { NotFoundError } from '../lib/errors.js'
import {
  normalizeSymbol,
  parseRange,
  parseSearchQuery,
  parseSymbols,
} from '../lib/validate.js'
import type { CacheResult, MarketDataService } from '../services/marketDataService.js'
import type { StockQuote } from '../providers/types.js'

const MAX_SEARCH_RESULTS = 20
const MAX_BATCH_SYMBOLS = 8

function sendResult<T>(res: Response, service: MarketDataService, result: CacheResult<T>): void {
  const info = service.getProviderInfo()
  res.setHeader('X-Data-Cache', result.cached ? (result.stale ? 'stale' : 'hit') : 'miss')
  res.json({
    data: result.data,
    meta: {
      provider: info.name,
      cached: result.cached,
      stale: result.stale,
      fetchedAt: new Date(result.fetchedAt).toISOString(),
      dataStatus: info.dataStatus,
      dataStatusNote: info.dataStatusNote,
    },
  })
}

function quoteMapToObject(map: Map<string, StockQuote>): Record<string, StockQuote> {
  return Object.fromEntries(map.entries())
}

export function createStocksRouter(service: MarketDataService): Router {
  const router = Router()

  router.get(
    '/search',
    asyncHandler(async (req, res) => {
      const query = parseSearchQuery(typeof req.query.q === 'string' ? req.query.q : undefined)
      const requestedLimit = Number(req.query.limit)
      const limit = Number.isFinite(requestedLimit)
        ? Math.min(Math.max(Math.trunc(requestedLimit), 1), MAX_SEARCH_RESULTS)
        : MAX_SEARCH_RESULTS

      const result = await service.search(query, limit, requestSignal(res))
      sendResult(res, service, result)
    }),
  )

  router.get(
    '/quotes',
    asyncHandler(async (req, res) => {
      const symbols = parseSymbols(
        typeof req.query.symbols === 'string' ? req.query.symbols : undefined,
        MAX_BATCH_SYMBOLS,
      )
      const result = await service.quotes(symbols, requestSignal(res))
      const map = quoteMapToObject(result.data)
      const missing = symbols.filter((symbol) => !result.data.has(symbol))
      sendResult(res, service, { ...result, data: { quotes: map, missing } })
    }),
  )

  router.get(
    '/:symbol/quote',
    asyncHandler(async (req, res) => {
      const symbol = normalizeSymbol(req.params.symbol)
      const result = await service.quote(symbol, requestSignal(res))
      if (!result.data) {
        throw new NotFoundError(`No quote is available for "${symbol}".`)
      }
      sendResult(res, service, result)
    }),
  )

  router.get(
    '/:symbol/history',
    asyncHandler(async (req, res) => {
      const symbol = normalizeSymbol(req.params.symbol)
      const range = parseRange(typeof req.query.range === 'string' ? req.query.range : undefined)
      const result = await service.history(symbol, range, requestSignal(res))
      if (!result.data) {
        throw new NotFoundError(`No historical prices are available for "${symbol}" (${range}).`)
      }
      sendResult(res, service, result)
    }),
  )

  router.get(
    '/:symbol/profile',
    asyncHandler(async (req, res) => {
      const symbol = normalizeSymbol(req.params.symbol)
      const result = await service.profile(symbol, requestSignal(res))
      if (!result.data) {
        throw new NotFoundError(`No company profile is available for "${symbol}".`)
      }
      sendResult(res, service, result)
    }),
  )

  return router
}
