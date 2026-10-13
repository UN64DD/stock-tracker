interface CacheEntry<T> {
  value: T
  expiresAt: number
  storedAt: number
}

export interface CacheLookup<T> {
  value: T
  fresh: boolean
  storedAt: number
}

/**
 * Tiny in-memory TTL cache. Deliberately not a distributed cache — this is a
 * single-process proxy whose goal is only to avoid duplicate provider calls.
 */
export class TTLCache {
  private readonly store = new Map<string, CacheEntry<unknown>>()
  private readonly maxEntries: number

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries
  }

  get<T>(key: string): CacheLookup<T> | undefined {
    const entry = this.store.get(key) as CacheEntry<T> | undefined
    if (!entry) return undefined
    return {
      value: entry.value,
      fresh: entry.expiresAt > Date.now(),
      storedAt: entry.storedAt,
    }
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    if (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next().value
      if (oldest !== undefined) this.store.delete(oldest)
    }
    const now = Date.now()
    this.store.set(key, { value, expiresAt: now + ttlMs, storedAt: now })
  }

  clear(): void {
    this.store.clear()
  }
}
