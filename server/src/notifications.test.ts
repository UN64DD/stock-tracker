import { createHmac } from 'node:crypto'
import type { Express } from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createTestApp, readSessionCookie } from './testing/fakes.js'
import type { EmailMessage, EmailProvider, EmailSendResult } from './providers/emailTypes.js'
import { EmailSendError } from './providers/emailTypes.js'

interface Session {
  cookie: string
  userId: string
  email: string
}

async function register(app: Express, email: string): Promise<Session> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'supersecret' })
  return {
    cookie: readSessionCookie(res.headers['set-cookie'] as unknown as string[])!,
    userId: res.body.data.user.id as string,
    email,
  }
}

async function createAlert(
  app: Express,
  cookie: string,
  body: Record<string, unknown>,
): Promise<string> {
  const res = await request(app).post('/api/alerts').set('Cookie', cookie).send(body)
  return res.body.data.alert.id as string
}

function evaluate(app: Express, cookie: string) {
  return request(app).post('/api/alerts/evaluate').set('Cookie', cookie)
}

function listNotifications(app: Express, cookie: string) {
  return request(app).get('/api/notifications').set('Cookie', cookie)
}

/** Computes a valid svix signature the way a real Resend endpoint would. */
function signWebhook(
  secret: string,
  id: string,
  timestamp: string,
  rawBody: string,
): string {
  const digest = createHmac('sha256', secret)
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest('hex')
  return `v1,${digest}`
}

describe('notifications: authentication', () => {
  it('requires a signed-in user for history, preferences and resend', async () => {
    const { app } = createTestApp()
    expect((await request(app).get('/api/notifications')).status).toBe(401)
    expect(
      (await request(app).patch('/api/notifications/preferences').send({ priceAlertEmails: true }))
        .status,
    ).toBe(401)
    expect((await request(app).post('/api/notifications/x/resend')).status).toBe(401)
  })
})

describe('notifications: sending on trigger', () => {
  it('sends one email when an alert transitions to triggered and records it as accepted', async () => {
    const { app, emailProvider } = createTestApp()
    const { cookie, email } = await register(app, 'ada@example.com')

    await createAlert(app, cookie, {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      condition: 'price_above',
      threshold: 100,
    })

    const res = await evaluate(app, cookie)
    expect(res.status).toBe(200)

    expect(emailProvider.messages).toHaveLength(1)
    const message = emailProvider.messages[0] as EmailMessage
    expect(message.to).toBe(email)
    expect(message.from).toContain('test@example.com')
    expect(message.subject).toBe('Price alert triggered: AAPL')
    expect(message.text).toContain('Apple Inc.')
    expect(message.text).toContain('$123.45')
    expect(message.text).toContain('$100.00')
    expect(message.text).toContain('http://localhost:5173/stocks/AAPL')
    expect(message.text).toContain('http://localhost:5173/alerts')
    expect(message.html).toContain('http://localhost:5173/stocks/AAPL')

    const history = await listNotifications(app, cookie)
    expect(history.status).toBe(200)
    expect(history.body.data.count).toBe(1)
    const [notification] = history.body.data.notifications
    expect(notification).toMatchObject({
      symbol: 'AAPL',
      companyName: 'Apple Inc.',
      condition: 'price_above',
      threshold: 100,
      triggerPrice: 123.45,
      status: 'accepted',
      attempts: 1,
      recipientEmail: email,
      providerMessageId: 'stub-message-1',
    })
    expect(notification.acceptedAt).not.toBeNull()
    expect(notification.lastAttemptAt).not.toBeNull()
    // Acceptance is not delivery: no webhook has confirmed anything yet.
    expect(notification.deliveredAt).toBeNull()
    expect(history.body.data.emailConfigured).toBe(true)
    expect(history.body.data.preferences).toEqual({ priceAlertEmails: true })
  })

  it('includes the session change for percentage alerts', async () => {
    const { app, emailProvider } = createTestApp()
    const { cookie } = await register(app, 'ada@example.com')
    await createAlert(app, cookie, {
      symbol: 'NVDA',
      condition: 'percent_increase',
      threshold: 10,
    })

    await evaluate(app, cookie)
    const message = emailProvider.messages[0] as EmailMessage
    expect(message.text).toContain('Session change: +50.00%')
    expect(message.text).toContain('Your threshold: 10.00%')
  })

  it('does not send again when evaluation runs again (duplicate-trigger protection)', async () => {
    const { app, emailProvider } = createTestApp()
    const { cookie } = await register(app, 'ada@example.com')
    await createAlert(app, cookie, {
      symbol: 'AAPL',
      condition: 'price_above',
      threshold: 100,
    })

    await evaluate(app, cookie)
    await evaluate(app, cookie)
    await evaluate(app, cookie)

    expect(emailProvider.messages).toHaveLength(1)
    const history = await listNotifications(app, cookie)
    expect(history.body.data.count).toBe(1)
  })

  it('skips email and history when the user has disabled price-alert emails', async () => {
    const { app, emailProvider } = createTestApp()
    const { cookie } = await register(app, 'ada@example.com')

    const patched = await request(app)
      .patch('/api/notifications/preferences')
      .set('Cookie', cookie)
      .send({ priceAlertEmails: false })
    expect(patched.status).toBe(200)
    expect(patched.body.data.preferences).toEqual({ priceAlertEmails: false })

    await createAlert(app, cookie, {
      symbol: 'AAPL',
      condition: 'price_above',
      threshold: 100,
    })
    const res = await evaluate(app, cookie)
    expect(res.status).toBe(200)
    // The alert still triggers; only the email is suppressed.
    expect(res.body.data.alerts[0].status).toBe('triggered')
    expect(emailProvider.messages).toHaveLength(0)
    expect((await listNotifications(app, cookie)).body.data.count).toBe(0)
  })

  it('notifies again after a re-armed alert triggers a second time', async () => {
    const { app, emailProvider } = createTestApp()
    const { cookie } = await register(app, 'ada@example.com')
    const id = await createAlert(app, cookie, {
      symbol: 'AAPL',
      condition: 'price_above',
      threshold: 100,
    })

    await evaluate(app, cookie)
    await request(app)
      .patch(`/api/alerts/${id}`)
      .set('Cookie', cookie)
      .send({ threshold: 100 })
    await evaluate(app, cookie)

    expect(emailProvider.messages).toHaveLength(2)
    expect((await listNotifications(app, cookie)).body.data.count).toBe(2)
  })
})

describe('notifications: provider failures', () => {
  it('records a provider failure without failing the evaluation request', async () => {
    const { app, emailProvider } = createTestApp()
    const { cookie } = await register(app, 'ada@example.com')
    emailProvider.failure = new EmailSendError(
      'provider_error',
      'The email provider is temporarily unavailable.',
    )

    await createAlert(app, cookie, {
      symbol: 'AAPL',
      condition: 'price_above',
      threshold: 100,
    })
    const res = await evaluate(app, cookie)
    expect(res.status).toBe(200)
    expect(res.body.data.alerts[0].status).toBe('triggered')

    const history = await listNotifications(app, cookie)
    const [notification] = history.body.data.notifications
    expect(notification.status).toBe('failed')
    expect(notification.errorCode).toBe('provider_error')
    expect(notification.errorMessage).toContain('temporarily unavailable')
    expect(notification.attempts).toBe(1)
    expect(notification.providerMessageId).toBeNull()
  })

  it('classifies invalid recipient and rate-limit failures distinctly', async () => {
    const { app, emailProvider } = createTestApp()
    const { cookie } = await register(app, 'ada@example.com')

    emailProvider.failure = new EmailSendError(
      'invalid_recipient',
      'The email provider rejected the recipient address or message.',
    )
    await createAlert(app, cookie, {
      symbol: 'AAPL',
      condition: 'price_above',
      threshold: 100,
    })
    await evaluate(app, cookie)
    let [notification] = (await listNotifications(app, cookie)).body.data.notifications
    expect(notification.errorCode).toBe('invalid_recipient')

    emailProvider.failure = new EmailSendError(
      'rate_limited',
      'The email provider rate limit was reached. The send can be retried later.',
    )
    // A second alert exercises the rate-limit classification independently.
    await createAlert(app, cookie, {
      symbol: 'MSFT',
      condition: 'price_above',
      threshold: 100,
    })
    await evaluate(app, cookie)
    const history = await listNotifications(app, cookie)
    notification = (
      history.body.data.notifications as Array<Record<string, unknown>>
    ).find((item) => item.symbol === 'MSFT')!
    expect(notification.errorCode).toBe('rate_limited')
    expect(notification.status).toBe('failed')
  })

  it('records a not-configured failure when the server has no email credentials', async () => {
    const unconfigured: EmailProvider = {
      name: 'unconfigured',
      configured: false,
      async send(): Promise<EmailSendResult> {
        throw new EmailSendError(
          'not_configured',
          'Email sending is not configured on the server (RESEND_API_KEY is unset).',
        )
      },
    }
    const { app } = createTestApp({}, { emailProvider: unconfigured })
    const { cookie } = await register(app, 'ada@example.com')
    await createAlert(app, cookie, {
      symbol: 'AAPL',
      condition: 'price_above',
      threshold: 100,
    })

    await evaluate(app, cookie)
    const history = await listNotifications(app, cookie)
    expect(history.body.data.emailConfigured).toBe(false)
    const [notification] = history.body.data.notifications
    expect(notification.status).toBe('failed')
    expect(notification.errorCode).toBe('not_configured')
  })

  it('resends a failed notification once the provider recovers', async () => {
    const { app, emailProvider } = createTestApp()
    const { cookie } = await register(app, 'ada@example.com')
    emailProvider.failure = new EmailSendError('rate_limited', 'Rate limited.')

    await createAlert(app, cookie, {
      symbol: 'AAPL',
      condition: 'price_above',
      threshold: 100,
    })
    await evaluate(app, cookie)
    const failedId = (
      await listNotifications(app, cookie)
    ).body.data.notifications[0].id as string

    // Resending while the provider is still failing keeps it failed.
    await request(app)
      .post(`/api/notifications/${failedId}/resend`)
      .set('Cookie', cookie)
      .expect(200)
    expect((await listNotifications(app, cookie)).body.data.notifications[0].attempts).toBe(2)

    emailProvider.failure = null
    const resent = await request(app)
      .post(`/api/notifications/${failedId}/resend`)
      .set('Cookie', cookie)
    expect(resent.status).toBe(200)
    expect(resent.body.data.notification).toMatchObject({
      status: 'accepted',
      attempts: 3,
      errorCode: null,
      providerMessageId: 'stub-message-1',
    })
    expect(emailProvider.messages).toHaveLength(1)
  })

  it('refuses to resend a notification that already succeeded', async () => {
    const { app } = createTestApp()
    const { cookie } = await register(app, 'ada@example.com')
    await createAlert(app, cookie, {
      symbol: 'AAPL',
      condition: 'price_above',
      threshold: 100,
    })
    await evaluate(app, cookie)
    const id = (await listNotifications(app, cookie)).body.data.notifications[0]
      .id as string

    const res = await request(app)
      .post(`/api/notifications/${id}/resend`)
      .set('Cookie', cookie)
    expect(res.status).toBe(409)
  })
})

describe('notifications: user isolation', () => {
  it("does not expose or resend another user's notifications", async () => {
    const { app } = createTestApp()
    const alice = await register(app, 'alice@example.com')
    const bob = await register(app, 'bob@example.com')

    await createAlert(app, alice.cookie, {
      symbol: 'AAPL',
      condition: 'price_above',
      threshold: 100,
    })
    await evaluate(app, alice.cookie)
    const aliceId = (
      await listNotifications(app, alice.cookie)
    ).body.data.notifications[0].id as string

    const bobHistory = await listNotifications(app, bob.cookie)
    expect(bobHistory.body.data.count).toBe(0)

    const resend = await request(app)
      .post(`/api/notifications/${aliceId}/resend`)
      .set('Cookie', bob.cookie)
    expect(resend.status).toBe(404)
  })
})

describe('notifications: preferences', () => {
  it('defaults to enabled and round-trips a change', async () => {
    const { app } = createTestApp()
    const { cookie } = await register(app, 'ada@example.com')

    const initial = await listNotifications(app, cookie)
    expect(initial.body.data.preferences).toEqual({ priceAlertEmails: true })

    await request(app)
      .patch('/api/notifications/preferences')
      .set('Cookie', cookie)
      .send({ priceAlertEmails: false })
      .expect(200)
    const after = await listNotifications(app, cookie)
    expect(after.body.data.preferences).toEqual({ priceAlertEmails: false })
  })

  it('rejects a non-boolean preference value', async () => {
    const { app } = createTestApp()
    const { cookie } = await register(app, 'ada@example.com')
    const res = await request(app)
      .patch('/api/notifications/preferences')
      .set('Cookie', cookie)
      .send({ priceAlertEmails: 'yes' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('validation_error')
  })
})

describe('notifications: webhooks', () => {
  const webhookBody = (emailId: string, type: string) =>
    JSON.stringify({ type, created_at: new Date().toISOString(), data: { email_id: emailId } })

  it('rejects unsigned or forged requests', async () => {
    const { app } = createTestApp()
    const raw = webhookBody('stub-message-1', 'email.delivered')
    const forged = await request(app)
      .post('/api/notifications/webhooks/resend')
      .set('Content-Type', 'application/json')
      .set('svix-id', 'msg_1')
      .set('svix-timestamp', String(Math.floor(Date.now() / 1000)))
      .set('svix-signature', 'v1,deadbeef')
      .send(raw)
    expect(forged.status).toBe(401)
    expect(forged.body.error.code).toBe('invalid_signature')

    const missing = await request(app)
      .post('/api/notifications/webhooks/resend')
      .set('Content-Type', 'application/json')
      .send(raw)
    expect(missing.status).toBe(401)
  })

  it('accepts a correctly signed delivery event and marks the notification delivered', async () => {
    const { app } = createTestApp()
    const { cookie } = await register(app, 'ada@example.com')
    await createAlert(app, cookie, {
      symbol: 'AAPL',
      condition: 'price_above',
      threshold: 100,
    })
    await evaluate(app, cookie)

    const raw = webhookBody('stub-message-1', 'email.delivered')
    const timestamp = String(Math.floor(Date.now() / 1000))
    const res = await request(app)
      .post('/api/notifications/webhooks/resend')
      .set('Content-Type', 'application/json')
      .set('svix-id', 'msg_1')
      .set('svix-timestamp', timestamp)
      .set('svix-signature', signWebhook('whsec_test_secret', 'msg_1', timestamp, raw))
      .send(raw)
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({ received: true, applied: true })

    const [notification] = (await listNotifications(app, cookie)).body.data
      .notifications
    expect(notification.status).toBe('delivered')
    expect(notification.deliveredAt).not.toBeNull()
  })

  it('marks a bounce event as failed', async () => {
    const { app } = createTestApp()
    const { cookie } = await register(app, 'ada@example.com')
    await createAlert(app, cookie, {
      symbol: 'AAPL',
      condition: 'price_above',
      threshold: 100,
    })
    await evaluate(app, cookie)

    const raw = webhookBody('stub-message-1', 'email.bounced')
    const timestamp = String(Math.floor(Date.now() / 1000))
    await request(app)
      .post('/api/notifications/webhooks/resend')
      .set('Content-Type', 'application/json')
      .set('svix-id', 'msg_2')
      .set('svix-timestamp', timestamp)
      .set('svix-signature', signWebhook('whsec_test_secret', 'msg_2', timestamp, raw))
      .send(raw)
      .expect(200)

    const [notification] = (await listNotifications(app, cookie)).body.data
      .notifications
    expect(notification.status).toBe('failed')
    expect(notification.errorCode).toBe('bounced')
  })

  it('returns 503 when webhook handling is not configured', async () => {
    const { app } = createTestApp({ emailWebhookSecret: undefined })
    const raw = webhookBody('stub-message-1', 'email.delivered')
    const res = await request(app)
      .post('/api/notifications/webhooks/resend')
      .set('Content-Type', 'application/json')
      .send(raw)
    expect(res.status).toBe(503)
    expect(res.body.error.code).toBe('not_configured')
  })
})

describe('notifications: history retention', () => {
  it('keeps notification history after the alert is deleted', async () => {
    const { app } = createTestApp()
    const { cookie } = await register(app, 'ada@example.com')
    const alertId = await createAlert(app, cookie, {
      symbol: 'AAPL',
      condition: 'price_above',
      threshold: 100,
    })
    await evaluate(app, cookie)

    await request(app).delete(`/api/alerts/${alertId}`).set('Cookie', cookie).expect(204)
    const history = await listNotifications(app, cookie)
    expect(history.body.data.count).toBe(1)
    expect(history.body.data.notifications[0].symbol).toBe('AAPL')
    expect(history.body.data.notifications[0].alertId).toBeNull()
  })
})
