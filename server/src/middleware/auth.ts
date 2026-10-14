import type { NextFunction, Request, Response } from 'express'
import { parseCookies } from '../lib/cookies.js'
import { UnauthorizedError } from '../lib/errors.js'
import type { AuthService, PublicUser } from '../services/authService.js'

export function getSessionToken(req: Request, cookieName: string): string | undefined {
  return parseCookies(req.headers.cookie)[cookieName]
}

export function getRequestUser(
  req: Request,
  auth: AuthService,
  cookieName: string,
): PublicUser | null {
  return auth.resolveSession(getSessionToken(req, cookieName))
}

/** Express middleware that rejects the request when no valid session exists. */
export function requireAuth(auth: AuthService, cookieName: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = getRequestUser(req, auth, cookieName)
    if (!user) {
      next(
        new UnauthorizedError(
          'Your session has expired. Please sign in again.',
          'session_expired',
        ),
      )
      return
    }
    req.user = user
    next()
  }
}

/** Narrows `req.user` for handlers mounted behind `requireAuth`. */
export function currentUser(req: Request): PublicUser {
  if (!req.user) {
    throw new UnauthorizedError('You must be signed in to do that.')
  }
  return req.user
}
