import { app } from 'electron'
import { join } from 'path'
import { applyMigrations } from './migrate.ts'
import { EXPECTED_TABLES } from './schema.ts'
import {
  encryptExistingPlainDatabase,
  openSqliteDatabase,
  probeSqliteAtRest,
  type SqliteAtRestKind
} from './sqliteAtRest.ts'
import type Database from 'better-sqlite3'

let dbInstance: Database.Database | null = null
let sessionPassphrase: string | undefined

export function getDatabasePath(): string {
  return join(app.getPath('userData'), 'lanpm.db')
}

export function getDatabaseAtRestKind(): SqliteAtRestKind {
  return probeSqliteAtRest(getDatabasePath())
}

export function initDatabase(options?: { passphrase?: string }): Database.Database {
  if (dbInstance) return dbInstance

  const dbPath = getDatabasePath()
  const kind = probeSqliteAtRest(dbPath)
  const passphrase = options?.passphrase ?? sessionPassphrase
  const db = openSqliteDatabase(dbPath, passphrase)
  if (kind === 'encrypted' && passphrase) {
    sessionPassphrase = passphrase
  }
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  applyMigrations(db)
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
  sessionPassphrase = undefined
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}

export function encryptOpenDatabase(passphrase: string): void {
  const dbPath = getDatabasePath()
  closeDatabase()
  try {
    encryptExistingPlainDatabase(dbPath, passphrase)
    sessionPassphrase = passphrase
    initDatabase({ passphrase })
  } catch (err) {
    sessionPassphrase = undefined
    if (probeSqliteAtRest(dbPath) === 'plain') {
      initDatabase()
    }
    throw err
  }
}
