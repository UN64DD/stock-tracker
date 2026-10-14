import type { Express } from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createTestApp, readSessionCookie } from './testing/fakes.js'

const CREDENTIALS = { email: 'jane@example.com', password: 'supersecret' }

async function register(app: Express, overrides: Record<string, string> = {}) {
  return request(app)
    .post('/api/auth/register')
    .send({ ...CREDENTIALS, ...overrides })
}

describe('auth: registration', () => {
  it('creates an account and starts an HttpOnly session', async () => {
    const { app } = createTestApp()
    const res = await register(app)

    expect(res.status).toBe(201)
    expect(res.body.data.user).toMatchObject({ email: CREDENTIALS.email })
    expect(res.body.data.user).not.toHaveProperty('password_hash')

    const setCookie = res.headers['set-cookie'] as unknown as string[]
    expect(setCookie.join(';')).toContain('HttpOnly')
    expect(readSessionCookie(setCookie)).toBeTruthy()
  })

  it('rejects duplicate emails', async () => {
    const { app } = createTestApp()
    await register(app)
    const res = await register(app)
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('conflict')
  })

  it('validates email and password', async () => {
    const { app } = createTestApp()
    expect((await register(app, { email: 'not-an-email' })).status).toBe(400)
    expect((await register(app, { password: 'short' })).status).toBe(400)
  })
})

describe('auth: login and session', () => {
  it('signs in with correct credentials and returns the current user', async () => {
    const { app } = createTestApp()
    await register(app)

    const login = await request(app).post('/api/auth/login').send(CREDENTIALS)
    expect(login.status).toBe(200)
    const cookie = readSessionCookie(login.headers['set-cookie'] as unknown as string[])
    expect(cookie).toBeTruthy()

    const me = await request(app).get('/api/auth/me').set('Cookie', cookie!)
    expect(me.status).toBe(200)
    expect(me.body.data.user.email).toBe(CREDENTIALS.email)
  })

  it('rejects a wrong password', async () => {
    const { app } = createTestApp()
    await register(app)
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: CREDENTIALS.email, password: 'wrong-password' })
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('invalid_credentials')
  })

  it('reports no user when unauthenticated', async () => {
    const { app } = createTestApp()
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
  })

  it('clears the session on logout', async () => {
    const { app } = createTestApp()
    const registration = await register(app)
    const cookie = readSessionCookie(registration.headers['set-cookie'] as unknown as string[])!

    await request(app).post('/api/auth/logout').set('Cookie', cookie).expect(204)
    const me = await request(app).get('/api/auth/me').set('Cookie', cookie)
    expect(me.status).toBe(401)
  })

  it('rejects an expired session', async () => {
    const { app, db } = createTestApp()
    const registration = await register(app)
    const cookie = readSessionCookie(registration.headers['set-cookie'] as unknown as string[])!

    db.prepare('UPDATE sessions SET expires_at = ?').run(new Date(Date.now() - 1000).toISOString())

    const me = await request(app).get('/api/auth/me').set('Cookie', cookie)
    expect(me.status).toBe(401)
  })
})
