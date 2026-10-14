import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { runMigrations } from './migrate.js'

export type DatabaseConnection = Database.Database

/**
 * Migrations live outside `src` so they are not re-emitted by the TypeScript
 * build. Resolution prefers the module-relative path (works for `src/db` under
 * tsx and `dist/db` after a build) and falls back to the process working
 * directory for bundlers/test runners that do not provide `import.meta.dirname`.
 */
export function defaultMigrationsDir(): string {
  const moduleDir =
    typeof import.meta.dirname === 'string' ? import.meta.dirname : undefined
  if (moduleDir) {
    const candidate = path.resolve(moduleDir, '../../migrations')
    if (existsSync(candidate)) return candidate
  }
  return path.resolve(process.cwd(), 'migrations')
}

export interface OpenDatabaseOptions {
  /** File path, or `:memory:` for an ephemeral database (tests). */
  databasePath: string
  migrationsDir?: string
}

/**
 * Opens (creating if needed) the SQLite database, enables foreign keys, and
 * applies pending migrations. Foreign keys must be enabled per connection,
 * which is what makes the `ON DELETE RESTRICT`/`CASCADE` rules effective.
 */
export function openDatabase({
  databasePath,
  migrationsDir = defaultMigrationsDir(),
}: OpenDatabaseOptions): DatabaseConnection {
  if (databasePath !== ':memory:') {
    mkdirSync(path.dirname(path.resolve(databasePath)), { recursive: true })
  }

  const db = new Database(databasePath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  runMigrations(db, migrationsDir)
  return db
}
