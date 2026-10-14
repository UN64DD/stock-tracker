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

describe('watchlist: authentication', () => {
  it('requires a signed-in user', async () => {
    const { app } = createTestApp()
    expect((await request(app).get('/api/watchlist')).status).toBe(401)
    expect((await request(app).post('/api/watchlist/items').send({ symbol: 'AAPL' })).status).toBe(401)
    expect((await request(app).delete('/api/watchlist/items/AAPL')).status).toBe(401)
  })
})

describe('watchlist: add, list, remove', () => {
  it('starts empty', async () => {
    const { app } = createTestApp()
    const { cookie } = await register(app, 'a@example.com')
    const res = await request(app).get('/api/watchlist').set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({ items: [], count: 0 })
  })

  it('adds, lists and removes an item', async () => {
    const { app } = createTestApp()
    const { cookie } = await register(app, 'a@example.com')

    const add = await request(app)
      .post('/api/watchlist/items')
      .set('Cookie', cookie)
      .send({ symbol: 'aapl', name: 'Apple Inc.', currency: 'USD', exchange: 'NASDAQ' })
    expect(add.status).toBe(201)
    expect(add.body.data.created).toBe(true)
    expect(add.body.data.item).toMatchObject({
      symbol: 'AAPL',
      name: 'Apple Inc.',
      currency: 'USD',
    })

    const list = await request(app).get('/api/watchlist').set('Cookie', cookie)
    expect(list.body.data.count).toBe(1)

    await request(app).delete('/api/watchlist/items/AAPL').set('Cookie', cookie).expect(204)
    const after = await request(app).get('/api/watchlist').set('Cookie', cookie)
    expect(after.body.data.count).toBe(0)
  })

  it('prevents duplicate entries', async () => {
    const { app, db } = createTestApp()
    const { cookie } = await register(app, 'a@example.com')

    await request(app).post('/api/watchlist/items').set('Cookie', cookie).send({ symbol: 'AAPL' })
    const second = await request(app)
      .post('/api/watchlist/items')
      .set('Cookie', cookie)
      .send({ symbol: 'AAPL' })

    expect(second.status).toBe(200)
    expect(second.body.data.created).toBe(false)

    const rows = db.prepare('SELECT COUNT(*) AS count FROM watchlist_items').get() as {
      count: number
    }
    expect(rows.count).toBe(1)
  })

  it('rejects an invalid symbol', async () => {
    const { app } = createTestApp()
    const { cookie } = await register(app, 'a@example.com')
    const res = await request(app)
      .post('/api/watchlist/items')
      .set('Cookie', cookie)
      .send({ symbol: 'not a symbol' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('validation_error')
  })

  it('keeps the stock catalogue row when an item is removed', async () => {
    const { app, db } = createTestApp()
    const { cookie } = await register(app, 'a@example.com')

    await request(app).post('/api/watchlist/items').set('Cookie', cookie).send({ symbol: 'AAPL' })
    await request(app).delete('/api/watchlist/items/AAPL').set('Cookie', cookie)

    const stock = db.prepare('SELECT symbol FROM stocks WHERE symbol = ?').get('AAPL')
    expect(stock).toMatchObject({ symbol: 'AAPL' })
  })

  it('persists items across logout and login', async () => {
    const { app } = createTestApp()
    const { cookie } = await register(app, 'a@example.com')
    await request(app).post('/api/watchlist/items').set('Cookie', cookie).send({ symbol: 'MSFT' })

    await request(app).post('/api/auth/logout').set('Cookie', cookie).expect(204)

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@example.com', password: 'supersecret' })
    const freshCookie = readSessionCookie(login.headers['set-cookie'] as unknown as string[])!

    const list = await request(app).get('/api/watchlist').set('Cookie', freshCookie)
    expect(list.body.data.count).toBe(1)
    expect(list.body.data.items[0].symbol).toBe('MSFT')
  })
})

describe('watchlist: user isolation', () => {
  it("does not expose or mutate another user's items", async () => {
    const { app } = createTestApp()
    const alice = await register(app, 'alice@example.com')
    const bob = await register(app, 'bob@example.com')

    await request(app)
      .post('/api/watchlist/items')
      .set('Cookie', alice.cookie)
      .send({ symbol: 'AAPL' })

    // Bob cannot see Alice's items.
    const bobList = await request(app).get('/api/watchlist').set('Cookie', bob.cookie)
    expect(bobList.body.data.count).toBe(0)

    // Bob's delete of the same symbol is a no-op for Alice's data.
    await request(app).delete('/api/watchlist/items/AAPL').set('Cookie', bob.cookie).expect(204)

    const aliceList = await request(app).get('/api/watchlist').set('Cookie', alice.cookie)
    expect(aliceList.body.data.count).toBe(1)
  })
})
