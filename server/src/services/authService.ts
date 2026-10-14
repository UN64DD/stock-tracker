import {
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto'
import type { DatabaseConnection } from '../db/database.js'
import { ConflictError, UnauthorizedError, ValidationError } from '../lib/errors.js'

const SCRYPT_KEY_LENGTH = 64
const MIN_PASSWORD_LENGTH = 8
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface PublicUser {
  id: string
  email: string
  displayName: string | null
  createdAt: string
}

interface UserRow {
  id: string
  email: string
  display_name: string | null
  password_hash: string
  password_salt: string
  created_at: string
}

interface SessionRow {
  user_id: string
  expires_at: string
}

export interface AuthResult {
  user: PublicUser
  token: string
  expiresAt: string
}

export interface AuthServiceOptions {
  sessionTtlSeconds: number
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString('hex')
}

function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    createdAt: row.created_at,
  }
}

/**
 * Email/password authentication backed by SQLite. Passwords are hashed with
 * scrypt and a per-user salt; sessions are opaque random tokens whose SHA-256
 * hash is stored, so a database leak does not expose usable session tokens.
 */
export class AuthService {
  constructor(
    private readonly db: DatabaseConnection,
    private readonly options: AuthServiceOptions,
  ) {}

  register(input: {
    email: string
    password: string
    displayName?: string | null
  }): AuthResult {
    const email = input.email.trim().toLowerCase()
    if (!EMAIL_PATTERN.test(email)) {
      throw new ValidationError('Enter a valid email address.')
    }
    if (input.password.length < MIN_PASSWORD_LENGTH) {
      throw new ValidationError(
        `Passwords must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      )
    }

    const existing = this.db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(email) as { id: string } | undefined
    if (existing) {
      throw new ConflictError('An account with that email already exists.')
    }

    const now = new Date().toISOString()
    const salt = randomBytes(16).toString('hex')
    const userId = randomUUID()
    const displayName = input.displayName?.trim() || null

    try {
      this.db
        .prepare(
          `INSERT INTO users (id, email, display_name, password_hash, password_salt, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(userId, email, displayName, hashPassword(input.password, salt), salt, now)
    } catch (error) {
      if (error instanceof Error && /UNIQUE/i.test(error.message)) {
        throw new ConflictError('An account with that email already exists.')
      }
      throw error
    }

    const user = this.db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRow
    return this.startSession(toPublicUser(user))
  }

  login(input: { email: string; password: string }): AuthResult {
    const email = input.email.trim().toLowerCase()
    const row = this.db.prepare('SELECT * FROM users WHERE email = ?').get(email) as
      | UserRow
      | undefined

    // Always run a hash comparison to keep the failure path from leaking
    // whether an email exists via response timing.
    const salt = row?.password_salt ?? randomBytes(16).toString('hex')
    const expected = row?.password_hash ?? randomBytes(SCRYPT_KEY_LENGTH).toString('hex')
    const actual = hashPassword(input.password, salt)
    const matches =
      row !== undefined &&
      expected.length === actual.length &&
      timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(actual, 'hex'))

    if (!row || !matches) {
      throw new UnauthorizedError('Incorrect email or password.', 'invalid_credentials')
    }

    return this.startSession(toPublicUser(row))
  }

  logout(token: string | undefined): void {
    if (!token) return
    this.db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token))
  }

  /** Returns the signed-in user for a session token, deleting it if expired. */
  resolveSession(token: string | undefined): PublicUser | null {
    if (!token) return null
    const tokenHash = hashToken(token)
    const session = this.db
      .prepare('SELECT user_id, expires_at FROM sessions WHERE token_hash = ?')
      .get(tokenHash) as SessionRow | undefined
    if (!session) return null

    if (new Date(session.expires_at).getTime() <= Date.now()) {
      this.db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash)
      return null
    }

    const user = this.db.prepare('SELECT * FROM users WHERE id = ?').get(session.user_id) as
      | UserRow
      | undefined
    return user ? toPublicUser(user) : null
  }

  private startSession(user: PublicUser): AuthResult {
    const token = randomBytes(32).toString('base64url')
    const now = new Date()
    const expiresAt = new Date(now.getTime() + this.options.sessionTtlSeconds * 1000)
    this.db
      .prepare(
        `INSERT INTO sessions (token_hash, user_id, created_at, expires_at)
         VALUES (?, ?, ?, ?)`,
      )
      .run(hashToken(token), user.id, now.toISOString(), expiresAt.toISOString())
    return { user, token, expiresAt: expiresAt.toISOString() }
  }
}
