import type { Express } from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createTestApp, readSessionCookie } from './testing/fakes.js'

interface Session {
  cookie: string
  userId: string
}

async function register(app: Express, email: string): Promise<Session> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'supersecret' })
  return {
    cookie: readSessionCookie(res.headers['set-cookie'] as unknown as string[])!,
    userId: res.body.data.user.id as string,
  }
}

async function createAlert(
  app: Express,
  cookie: string,
  body: Record<string, unknown>,
): Promise<{ id: string; status: number; body: Record<string, unknown> }> {
  const res = await request(app)
    .post('/api/alerts')
    .set('Cookie', cookie)
    .send(body)
  return { id: res.body.data.alert.id as string, status: res.status, body: res.body }
}

describe('alerts: authentication', () => {
  it('requires a signed-in user', async () => {
    const { app } = createTestApp()
    expect((await request(app).get('/api/alerts')).status).toBe(401)
    expect(
      (await request(app).post('/api/alerts').send({ symbol: 'AAPL' })).status,
    ).toBe(401)
    expect((await request(app).post('/api/alerts/evaluate')).status).toBe(401)
    expect((await request(app).patch('/api/alerts/x').send({ enabled: true })).status).toBe(401)
    expect((await request(app).delete('/api/alerts/x')).status).toBe(401)
  })
})

describe('alerts: create, list, update, delete', () => {
  it('starts empty', async () => {
    const { app } = createTestApp()
    const { cookie } = await register(app, 'a@example.com')
    const res = await request(app).get('/api/alerts').set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({ alerts: [], count: 0 })
  })

  it('creates a normalized alert and lists it', async () => {
    const { app } = createTestApp()
    const { cookie } = await register(app, 'a@example.com')

    const created = await createAlert(app, cookie, {
      symbol: 'aapl',
      name: 'Apple Inc.',
      currency: 'USD',
      exchange: 'NASDAQ',
      condition: 'price_above',
      threshold: 200,
    })
    expect(created.status).toBe(201)
    expect(created.body.data.alert).toMatchObject({
      symbol: 'AAPL',
      name: 'Apple Inc.',
      condition: 'price_above',
      threshold: 200,
      enabled: true,
      status: 'active',
      triggeredAt: null,
    })

    const list = await request(app).get('/api/alerts').set('Cookie', cookie)
    expect(list.body.data.count).toBe(1)
    expect(list.body.data.alerts[0].id).toBe(created.id)
  })

  it('updates condition, threshold and enabled and re-arms a triggered alert', async () => {
    const { app } = createTestApp()
    const { cookie } = await register(app, 'a@example.com')
    const { id } = await createAlert(app, cookie, {
      symbol: 'AAPL',
      condition: 'price_above',
      threshold: 100,
    })

    // Trigger it.
    await request(app).post('/api/alerts/evaluate').set('Cookie', cookie)
    const triggered = await request(app).get('/api/alerts').set('Cookie', cookie)
    expect(triggered.body.data.alerts[0].status).toBe('triggered')

    // Change the rule -> back to active.
    const updated = await request(app)
      .patch(`/api/alerts/${id}`)
      .set('Cookie', cookie)
      .send({ condition: 'percent_decrease', threshold: 10 })
    expect(updated.status).toBe(200)
    expect(updated.body.data.alert).toMatchObject({
      condition: 'percent_decrease',
      threshold: 10,
      status: 'active',
      triggeredAt: null,
    })

    // Disable it.
    const disabled = await request(app)
      .patch(`/api/alerts/${id}`)
      .set('Cookie', cookie)
      .send({ enabled: false })
    expect(disabled.body.data.alert.status).toBe('disabled')
  })

  it('deletes an owned alert', async () => {
    const { app } = createTestApp()
    const { cookie } = await register(app, 'a@example.com')
    const { id } = await createAlert(app, cookie, {
      symbol: 'AAPL',
      condition: 'price_above',
      threshold: 100,
    })

    await request(app).delete(`/api/alerts/${id}`).set('Cookie', cookie).expect(204)
    const list = await request(app).get('/api/alerts').set('Cookie', cookie)
    expect(list.body.data.count).toBe(0)
  })
})

describe('alerts: validation', () => {
  async function registerUser() {
    const { app } = createTestApp()
    const { cookie } = await register(app, 'a@example.com')
    return { app, cookie }
  }

  it('rejects an invalid symbol', async () => {
    const { app, cookie } = await registerUser()
    const res = await request(app)
      .post('/api/alerts')
      .set('Cookie', cookie)
      .send({ symbol: 'not a symbol', condition: 'price_above', threshold: 10 })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('validation_error')
  })

  it('rejects an unsupported condition', async () => {
    const { app, cookie } = await registerUser()
    const res = await request(app)
      .post('/api/alerts')
      .set('Cookie', cookie)
      .send({ symbol: 'AAPL', condition: 'price_sideways', threshold: 10 })
    expect(res.status).toBe(400)
  })

  it('rejects non-positive and non-numeric thresholds', async () => {
    const { app, cookie } = await registerUser()
    for (const threshold of [0, -5, 'abc']) {
      const res = await request(app)
        .post('/api/alerts')
        .set('Cookie', cookie)
        .send({ symbol: 'AAPL', condition: 'percent_increase', threshold })
      expect(res.status).toBe(400)
    }
  })

  it('rejects an empty patch', async () => {
    const { app, cookie } = await registerUser()
    const { id } = await createAlert(app, cookie, {
      symbol: 'AAPL',
      condition: 'price_above',
      threshold: 100,
    })
    const res = await request(app)
      .patch(`/api/alerts/${id}`)
      .set('Cookie', cookie)
      .send({})
    expect(res.status).toBe(400)
  })
})

describe('alerts: evaluation', () => {
  it('triggers price_above, price_below and percentage alerts from live data', async () => {
    const { app } = createTestApp()
    const { cookie } = await register(app, 'a@example.com')

    await createAlert(app, cookie, {
      symbol: 'AAPL',
      condition: 'price_above',
      threshold: 100,
    })
    await createAlert(app, cookie, {
      symbol: 'MSFT',
      condition: 'price_below',
      threshold: 200,
    })
    await createAlert(app, cookie, {
      symbol: 'NVDA',
      condition: 'percent_increase',
      threshold: 10,
    })
    // Disabled alerts must be left untouched.
    await createAlert(app, cookie, {
      symbol: 'TSLA',
      condition: 'price_above',
      threshold: 1,
      enabled: false,
    })

    const evaluated = await request(app)
      .post('/api/alerts/evaluate')
      .set('Cookie', cookie)
    expect(evaluated.status).toBe(200)

    const bySymbol = Object.fromEntries(
      (evaluated.body.data.alerts as Array<Record<string, unknown>>).map(
        (alert) => [alert.symbol, alert],
      ),
    )
    expect(bySymbol.AAPL.status).toBe('triggered')
    expect(bySymbol.MSFT.status).toBe('triggered')
    expect(bySymbol.NVDA.status).toBe('triggered')
    expect(bySymbol.AAPL.triggeredAt).not.toBeNull()
    expect(bySymbol.NVDA.lastPrice).toBe(150)
    expect(bySymbol.NVDA.baselinePrice).toBe(100)

    // Disabled alert is untouched.
    expect(bySymbol.TSLA.status).toBe('disabled')
    expect(bySymbol.TSLA.lastCheckedAt).toBeNull()
  })

  it('does not trigger an alert that has not met its threshold', async () => {
    const { app } = createTestApp()
    const { cookie } = await register(app, 'a@example.com')
    await createAlert(app, cookie, {
      symbol: 'AAPL',
      condition: 'price_above',
      threshold: 1000,
    })

    await request(app).post('/api/alerts/evaluate').set('Cookie', cookie)
    const list = await request(app).get('/api/alerts').set('Cookie', cookie)
    expect(list.body.data.alerts[0].status).toBe('active')
    expect(list.body.data.alerts[0].lastCheckedAt).not.toBeNull()
  })
})

describe('alerts: user isolation', () => {
  it("does not expose or mutate another user's alerts", async () => {
    const { app } = createTestApp()
    const alice = await register(app, 'alice@example.com')
    const bob = await register(app, 'bob@example.com')

    const { id } = await createAlert(app, alice.cookie, {
      symbol: 'AAPL',
      condition: 'price_above',
      threshold: 100,
    })

    // Bob cannot see Alice's alert.
    const bobList = await request(app).get('/api/alerts').set('Cookie', bob.cookie)
    expect(bobList.body.data.count).toBe(0)

    // Bob cannot update or delete it, and gets a 404 (no enumeration).
    expect(
      (
        await request(app)
          .patch(`/api/alerts/${id}`)
          .set('Cookie', bob.cookie)
          .send({ enabled: false })
      ).status,
    ).toBe(404)
    expect(
      (await request(app).delete(`/api/alerts/${id}`).set('Cookie', bob.cookie)).status,
    ).toBe(404)

    // Alice's alert is unchanged.
    const aliceList = await request(app).get('/api/alerts').set('Cookie', alice.cookie)
    expect(aliceList.body.data.count).toBe(1)
    expect(aliceList.body.data.alerts[0].enabled).toBe(true)
  })

  it('derives ownership from the session, ignoring a spoofed user id', async () => {
    const { app } = createTestApp()
    const alice = await register(app, 'alice@example.com')
    const bob = await register(app, 'bob@example.com')

    // `userId` is not a recognized field; the alert must belong to the session.
    const res = await request(app)
      .post('/api/alerts')
      .set('Cookie', alice.cookie)
      .send({
        symbol: 'AAPL',
        condition: 'price_above',
        threshold: 100,
        userId: bob.userId,
      })
    expect(res.status).toBe(201)

    const bobList = await request(app).get('/api/alerts').set('Cookie', bob.cookie)
    expect(bobList.body.data.count).toBe(0)
    const aliceList = await request(app).get('/api/alerts').set('Cookie', alice.cookie)
    expect(aliceList.body.data.count).toBe(1)
  })
})
