import { Router } from 'express'
import type { AppConfig } from '../config.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { ValidationError } from '../lib/errors.js'
import { verifySvixSignature } from '../lib/webhookSignature.js'
import { currentUser, requireAuth } from '../middleware/auth.js'
import type { AuthService } from '../services/authService.js'
import type {
  NotificationService,
  WebhookEvent,
} from '../services/notificationService.js'

function headerValue(
  req: { headers: Record<string, unknown> },
  name: string,
): string | undefined {
  const value = req.headers[name]
  return typeof value === 'string' ? value : undefined
}

/**
 * Notification history and preferences for the signed-in user, plus the public
 * provider webhook endpoint.
 *
 * The webhook route is intentionally *not* session-authenticated: delivery is
 * authenticated by the Svix signature (see `verifySvixSignature`), which is
 * verified against the raw body before any state is touched. All other routes
 * are scoped to the session user by the service layer.
 */
export function createNotificationsRouter(
  notifications: NotificationService,
  auth: AuthService,
  config: AppConfig,
): Router {
  const router = Router()

  router.post('/webhooks/resend', (req, res) => {
    const secret = config.emailWebhookSecret
    if (!secret) {
      res.status(503).json({
        error: {
          code: 'not_configured',
          message: 'Webhook handling is not configured on the server.',
        },
      })
      return
    }

    const valid = verifySvixSignature(
      secret,
      {
        id: headerValue(req, 'svix-id'),
        timestamp: headerValue(req, 'svix-timestamp'),
        signature: headerValue(req, 'svix-signature'),
      },
      req.rawBody ?? '',
    )
    if (!valid) {
      res.status(401).json({
        error: {
          code: 'invalid_signature',
          message: 'The webhook signature could not be verified.',
        },
      })
      return
    }

    const applied = notifications.applyWebhookEvent((req.body ?? {}) as WebhookEvent)
    res.json({ data: { received: true, applied } })
  })

  router.use(requireAuth(auth, config.authCookieName))

  router.get('/', (req, res) => {
    const user = currentUser(req)
    const items = notifications.list(user.id)
    res.json({
      data: {
        notifications: items,
        count: items.length,
        preferences: {
          priceAlertEmails: notifications.priceAlertEmailsEnabled(user.id),
        },
        emailConfigured: notifications.emailConfigured,
      },
    })
  })

  router.patch(
    '/preferences',
    asyncHandler((req, res) => {
      const user = currentUser(req)
      const body = (req.body ?? {}) as Record<string, unknown>
      if (typeof body.priceAlertEmails !== 'boolean') {
        throw new ValidationError('"priceAlertEmails" must be true or false.')
      }
      notifications.setPriceAlertEmails(user.id, body.priceAlertEmails)
      res.json({
        data: {
          preferences: {
            priceAlertEmails: notifications.priceAlertEmailsEnabled(user.id),
          },
        },
      })
    }),
  )

  router.post(
    '/:id/resend',
    asyncHandler(async (req, res) => {
      const user = currentUser(req)
      const notification = await notifications.resend(user.id, req.params.id)
      res.json({ data: { notification } })
    }),
  )

  return router
}
