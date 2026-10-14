import { config as loadDotenv } from 'dotenv'

loadDotenv()

export interface CacheTtlConfig {
  quote: number
  history: number
  search: number
  profile: number
  financials: number
}

export interface AppConfig {
  port: number
  provider: string
  stockApiKey?: string
  providerCreditsPerMinute: number
  providerCreditsPerDay: number
  requestTimeoutMs: number
  corsOrigin: string
  cacheTtl: CacheTtlConfig
  /** SQLite database file path, or `:memory:` for an ephemeral store. */
  databasePath: string
  /** Session lifetime in seconds. */
  sessionTtlSeconds: number
  /** Name of the HttpOnly session cookie. */
  authCookieName: string
  /** Adds the `Secure` attribute to the session cookie (enable behind HTTPS). */
  cookieSecure: boolean
}

function readInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function readString(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim()
  return trimmed ? trimmed : fallback
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    port: readInt(env.PORT, 3001),
    provider: readString(env.STOCK_DATA_PROVIDER, 'twelvedata').toLowerCase(),
    stockApiKey: env.STOCK_API_KEY?.trim() || undefined,
    providerCreditsPerMinute: readInt(env.PROVIDER_CREDITS_PER_MINUTE, 8),
    providerCreditsPerDay: readInt(env.PROVIDER_CREDITS_PER_DAY, 800),
    requestTimeoutMs: readInt(env.REQUEST_TIMEOUT_MS, 8000),
    corsOrigin: readString(env.CORS_ORIGIN, 'http://localhost:5173'),
    databasePath: readString(env.DATABASE_PATH, './data/stock-tracker.sqlite'),
    sessionTtlSeconds: readInt(env.SESSION_TTL_SECONDS, 604_800),
    authCookieName: readString(env.AUTH_COOKIE_NAME, 'st_session'),
    cookieSecure: readString(env.COOKIE_SECURE, 'false').toLowerCase() === 'true',
    cacheTtl: {
      quote: readInt(env.CACHE_TTL_QUOTE_SECONDS, 60) * 1000,
      history: readInt(env.CACHE_TTL_HISTORY_SECONDS, 300) * 1000,
      search: readInt(env.CACHE_TTL_SEARCH_SECONDS, 300) * 1000,
      profile: readInt(env.CACHE_TTL_PROFILE_SECONDS, 86_400) * 1000,
      financials: readInt(env.CACHE_TTL_FINANCIALS_SECONDS, 86_400) * 1000,
    },
  }
}
