import type { PublicUser } from '../services/authService.js'

declare global {
  namespace Express {
    interface Request {
      /** Populated by the `requireAuth` middleware after session validation. */
      user?: PublicUser
      /**
       * Raw request body bytes, captured by `express.json({ verify })` so
       * webhook signatures can be verified against the exact payload.
       */
      rawBody?: string
    }
  }
}

export {}
