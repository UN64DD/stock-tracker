import { Router } from 'express'
import type { AppConfig } from '../config.js'
import { asyncHandler, requestSignal } from '../lib/asyncHandler.js'
import { ValidationError } from '../lib/errors.js'
import { normalizeSymbol } from '../lib/validate.js'
import { currentUser, requireAuth } from '../middleware/auth.js'
import {
  parseAlertCondition,
  parseAlertThreshold,
} from '../services/alertEvaluation.js'
import type { AuthService } from '../services/authService.js'
import type { PriceAlertService } from '../services/priceAlertService.js'

function optionalMetadata(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function parseEnabled(value: unknown): boolean | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'boolean') {
    throw new ValidationError('"enabled" must be true or false.')
  }
  return value
}

export function createAlertsRouter(
  alerts: PriceAlertService,
  auth: AuthService,
  config: AppConfig,
): Router {
  const router = Router()
  router.use(requireAuth(auth, config.authCookieName))

  router.get('/', (req, res) => {
    const user = currentUser(req)
    const items = alerts.list(user.id)
    res.json({ data: { alerts: items, count: items.length } })
  })

  router.post(
    '/',
    asyncHandler((req, res) => {
      const user = currentUser(req)
      const body = (req.body ?? {}) as Record<string, unknown>
      const symbol = normalizeSymbol(
        typeof body.symbol === 'string' ? body.symbol : undefined,
      )
      const condition = parseAlertCondition(body.condition)
      const threshold = parseAlertThreshold(body.threshold)

      const alert = alerts.create(user.id, {
        symbol,
        name: optionalMetadata(body.name),
        currency: optionalMetadata(body.currency),
        exchange: optionalMetadata(body.exchange),
        condition,
        threshold,
        enabled: parseEnabled(body.enabled),
      })
      res.status(201).json({ data: { alert } })
    }),
  )

  router.post(
    '/evaluate',
    asyncHandler(async (req, res) => {
      const user = currentUser(req)
      const items = await alerts.evaluate(user.id, requestSignal(res))
      res.json({ data: { alerts: items, count: items.length } })
    }),
  )

  router.patch(
    '/:id',
    asyncHandler((req, res) => {
      const user = currentUser(req)
      const body = (req.body ?? {}) as Record<string, unknown>
      const changes: {
        condition?: ReturnType<typeof parseAlertCondition>
        threshold?: number
        enabled?: boolean
      } = {}

      if (body.condition !== undefined) {
        changes.condition = parseAlertCondition(body.condition)
      }
      if (body.threshold !== undefined) {
        changes.threshold = parseAlertThreshold(body.threshold)
      }
      if (body.enabled !== undefined) {
        changes.enabled = parseEnabled(body.enabled)
      }

      if (Object.keys(changes).length === 0) {
        throw new ValidationError(
          'Provide a condition, threshold, or enabled value to update.',
        )
      }

      const alert = alerts.update(user.id, req.params.id, changes)
      res.json({ data: { alert } })
    }),
  )

  router.delete(
    '/:id',
    asyncHandler((req, res) => {
      const user = currentUser(req)
      alerts.remove(user.id, req.params.id)
      res.status(204).end()
    }),
  )

  return router
}
