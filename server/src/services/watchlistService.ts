import { randomUUID } from 'node:crypto'
import type { DatabaseConnection } from '../db/database.js'

const DEFAULT_WATCHLIST_NAME = 'My Watchlist'

export interface WatchlistItem {
  id: string
  symbol: string
  name: string | null
  currency: string | null
  exchange: string | null
  addedAt: string
}

interface ItemRow {
  id: string
  symbol: string
  name: string | null
  currency: string | null
  exchange: string | null
  addedAt: string
}

export interface AddItemInput {
  symbol: string
  name?: string | null
  currency?: string | null
  exchange?: string | null
}

export interface AddItemResult {
  item: WatchlistItem
  created: boolean
}

/**
 * Persists each user's default watchlist. Isolation is enforced here: every
 * statement is scoped by `user_id`, so a user can only ever read or mutate
 * their own rows.
 */
export class WatchlistService {
  constructor(private readonly db: DatabaseConnection) {}

  private ensureDefaultWatchlist(userId: string): string {
    const existing = this.db
      .prepare('SELECT id FROM watchlists WHERE user_id = ? ORDER BY created_at ASC LIMIT 1')
      .get(userId) as { id: string } | undefined
    if (existing) return existing.id

    const id = randomUUID()
    this.db
      .prepare('INSERT INTO watchlists (id, user_id, name, created_at) VALUES (?, ?, ?, ?)')
      .run(id, userId, DEFAULT_WATCHLIST_NAME, new Date().toISOString())
    return id
  }

  list(userId: string): WatchlistItem[] {
    this.ensureDefaultWatchlist(userId)
    return this.db
      .prepare(
        `SELECT wi.id AS id,
                wi.symbol AS symbol,
                wi.created_at AS addedAt,
                s.name AS name,
                s.currency AS currency,
                s.exchange AS exchange
           FROM watchlist_items wi
           JOIN watchlists w ON w.id = wi.watchlist_id
           JOIN stocks s ON s.symbol = wi.symbol
          WHERE w.user_id = ?
          ORDER BY wi.created_at ASC, wi.symbol ASC`,
      )
      .all(userId) as ItemRow[]
  }

  add(userId: string, input: AddItemInput): AddItemResult {
    const watchlistId = this.ensureDefaultWatchlist(userId)
    const now = new Date().toISOString()

    const run = this.db.transaction((): AddItemResult => {
      // Cache the metadata the client already has; never overwrite a known
      // value with null.
      this.db
        .prepare(
          `INSERT INTO stocks (symbol, name, currency, exchange, created_at, updated_at)
           VALUES (@symbol, @name, @currency, @exchange, @now, @now)
           ON CONFLICT (symbol) DO UPDATE SET
             name = COALESCE(excluded.name, stocks.name),
             currency = COALESCE(excluded.currency, stocks.currency),
             exchange = COALESCE(excluded.exchange, stocks.exchange),
             updated_at = excluded.updated_at`,
        )
        .run({
          symbol: input.symbol,
          name: input.name ?? null,
          currency: input.currency ?? null,
          exchange: input.exchange ?? null,
          now,
        })

      const itemId = randomUUID()
      const inserted = this.db
        .prepare(
          `INSERT INTO watchlist_items (id, watchlist_id, symbol, created_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT (watchlist_id, symbol) DO NOTHING`,
        )
        .run(itemId, watchlistId, input.symbol, now)

      const item = this.db
        .prepare(
          `SELECT wi.id AS id,
                  wi.symbol AS symbol,
                  wi.created_at AS addedAt,
                  s.name AS name,
                  s.currency AS currency,
                  s.exchange AS exchange
             FROM watchlist_items wi
             JOIN stocks s ON s.symbol = wi.symbol
            WHERE wi.watchlist_id = ? AND wi.symbol = ?`,
        )
        .get(watchlistId, input.symbol) as ItemRow

      return { item, created: inserted.changes === 1 }
    })

    return run()
  }

  remove(userId: string, symbol: string): boolean {
    // Deletes only the join row; the `stocks` catalogue entry is preserved.
    const result = this.db
      .prepare(
        `DELETE FROM watchlist_items
          WHERE symbol = ?
            AND watchlist_id IN (SELECT id FROM watchlists WHERE user_id = ?)`,
      )
      .run(symbol, userId)
    return result.changes > 0
  }
}
