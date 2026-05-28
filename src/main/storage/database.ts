import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { EXPECTED_TABLES, SCHEMA_SQL, SCHEMA_VERSION } from './schema'

let dbInstance: Database.Database | null = null

export function getDatabasePath(): string {
  return join(app.getPath('userData'), 'lanpm.db')
}

export function initDatabase(): Database.Database {
  if (dbInstance) return dbInstance

  const dbPath = getDatabasePath()
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  const version = db.pragma('user_version', { simple: true }) as number
  if (version < SCHEMA_VERSION) {
    if (version === 0) {
      db.exec(SCHEMA_SQL)
    }
    db.pragma(`user_version = ${SCHEMA_VERSION}`)
  }

  verifySchema(db)
  dbInstance = db
  return db
}

function verifySchema(db: Database.Database): void {
  const rows = db
    .prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
    )
    .all() as { name: string }[]
  const existing = new Set(rows.map((r) => r.name))
  const missing = EXPECTED_TABLES.filter((t) => !existing.has(t))
  if (missing.length > 0) {
    throw new Error(`SQLite schema incomplete, missing tables: ${missing.join(', ')}`)
  }
}

export function getDatabase(): Database.Database {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDatabase() before use.')
  }
  return dbInstance
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}
