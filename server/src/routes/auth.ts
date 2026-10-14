import { Router, type Response } from 'express'
import type { AppConfig } from '../config.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { serializeCookie } from '../lib/cookies.js'
import { UnauthorizedError, ValidationError } from '../lib/errors.js'
import { getRequestUser, getSessionToken } from '../middleware/auth.js'
import type { AuthService } from '../services/authService.js'

function asOptionalString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

export function createAuthRouter(auth: AuthService, config: AppConfig): Router {
  const router = Router()

  const setSessionCookie = (res: Response, token: string): void => {
    res.setHeader(
      'Set-Cookie',
      serializeCookie(config.authCookieName, token, {
        maxAgeSeconds: config.sessionTtlSeconds,
        secure: config.cookieSecure,
      }),
    )
  }

  const clearSessionCookie = (res: Response): void => {
    res.setHeader(
      'Set-Cookie',
      serializeCookie(config.authCookieName, '', {
        maxAgeSeconds: 0,
        secure: config.cookieSecure,
      }),
    )
  }

  router.post(
    '/register',
    asyncHandler((req, res) => {
      const body = (req.body ?? {}) as Record<string, unknown>
      if (typeof body.email !== 'string' || typeof body.password !== 'string') {
        throw new ValidationError('Email and password are required.')
      }
      const result = auth.register({
        email: body.email,
        password: body.password,
        displayName: asOptionalString(body.displayName),
      })
      setSessionCookie(res, result.token)
      res.status(201).json({ data: { user: result.user } })
    }),
  )

  router.post(
    '/login',
    asyncHandler((req, res) => {
      const body = (req.body ?? {}) as Record<string, unknown>
      if (typeof body.email !== 'string' || typeof body.password !== 'string') {
        throw new ValidationError('Email and password are required.')
      }
      const result = auth.login({ email: body.email, password: body.password })
      setSessionCookie(res, result.token)
      res.json({ data: { user: result.user } })
    }),
  )

  router.post('/logout', (req, res) => {
    auth.logout(getSessionToken(req, config.authCookieName))
    clearSessionCookie(res)
    res.status(204).end()
  })

  router.get('/me', (req, res) => {
    const user = getRequestUser(req, auth, config.authCookieName)
    if (!user) {
      throw new UnauthorizedError('You are not signed in.', 'unauthenticated')
    }
    res.json({ data: { user } })
  })

  return router
}
