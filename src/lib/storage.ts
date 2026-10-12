export const STORAGE_KEYS = {
  watchlist: 'stock-tracker:watchlist',
  alerts: 'stock-tracker:alerts',
  theme: 'stock-tracker:theme',
  preferences: 'stock-tracker:preferences',
  adminStocks: 'stock-tracker:admin-stocks',
  adminNews: 'stock-tracker:admin-news',
} as const

export function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Persistence is best-effort for this demo; ignore quota/security errors.
  }
}

export function removeStorage(key: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Ignore storage errors in the prototype.
  }
}
