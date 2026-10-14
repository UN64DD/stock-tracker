import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import type { Database } from 'better-sqlite3'

interface MigrationRow {
  name: string
}

/**
 * Applies any migration files that have not been recorded yet, in filename
 * order, each inside its own transaction. Migrations are append-only: once a
 * file has been applied it must never be edited, only superseded.
 */
export function runMigrations(db: Database, migrationsDir: string): string[] {
  db.exec(
    'CREATE TABLE IF NOT EXISTS schema_migrations (' +
      'name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)',
  )

  const applied = new Set(
    (db.prepare('SELECT name FROM schema_migrations').all() as MigrationRow[]).map(
      (row) => row.name,
    ),
  )

  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort()

  const newlyApplied: string[] = []
  const record = db.prepare(
    'INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)',
  )

  for (const file of files) {
    if (applied.has(file)) continue
    const sql = readFileSync(path.join(migrationsDir, file), 'utf8')
    const apply = db.transaction(() => {
      db.exec(sql)
      record.run(file, new Date().toISOString())
    })
    apply()
    newlyApplied.push(file)
  }

  return newlyApplied
}
