import type { PublicUser } from '../services/authService.js'

declare global {
  namespace Express {
    interface Request {
      /** Populated by the `requireAuth` middleware after session validation. */
      user?: PublicUser
    }
  }
}

export {}
