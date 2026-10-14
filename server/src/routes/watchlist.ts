import { Router } from 'express'
import type { AppConfig } from '../config.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { normalizeSymbol } from '../lib/validate.js'
import { currentUser, requireAuth } from '../middleware/auth.js'
import type { AuthService } from '../services/authService.js'
import type { AddItemInput, WatchlistService } from '../services/watchlistService.js'

function optionalMetadata(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export function createWatchlistRouter(
  watchlist: WatchlistService,
  auth: AuthService,
  config: AppConfig,
): Router {
  const router = Router()
  router.use(requireAuth(auth, config.authCookieName))

  router.get('/', (req, res) => {
    const user = currentUser(req)
    const items = watchlist.list(user.id)
    res.json({ data: { items, count: items.length } })
  })

  router.post(
    '/items',
    asyncHandler((req, res) => {
      const user = currentUser(req)
      const body = (req.body ?? {}) as Record<string, unknown>
      const symbol = normalizeSymbol(typeof body.symbol === 'string' ? body.symbol : undefined)
      const input: AddItemInput = {
        symbol,
        name: optionalMetadata(body.name),
        currency: optionalMetadata(body.currency),
        exchange: optionalMetadata(body.exchange),
      }
      const result = watchlist.add(user.id, input)
      res.status(result.created ? 201 : 200).json({
        data: { item: result.item, created: result.created },
      })
    }),
  )

  router.delete(
    '/items/:symbol',
    asyncHandler((req, res) => {
      const user = currentUser(req)
      const symbol = normalizeSymbol(req.params.symbol)
      watchlist.remove(user.id, symbol)
      res.status(204).end()
    }),
  )

  return router
}
