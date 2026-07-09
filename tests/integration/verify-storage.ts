/**
 * SQLite schema + migration bootstrap + users/devices round-trip.
 * Run: npm run verify:storage
 */
import Database from 'better-sqlite3'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { applyMigrations, MIGRATIONS } from '../../src/main/storage/migrate.ts'
import { EXPECTED_TABLES, SCHEMA_VERSION } from '../../src/main/storage/schema.ts'

function assertTables(db: Database.Database): void {
  const tables = (
    db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`
      )
      .all() as { name: string }[]
  )
    .map((r) => r.name)
    .sort()
  const missing = EXPECTED_TABLES.filter((t) => !tables.includes(t))
  if (missing.length) {
    throw new Error(`Missing tables: ${missing.join(', ')}`)
  }
}

function withTempDb(fn: (db: Database.Database, dbPath: string) => void): void {
  const dir = mkdtempSync(join(tmpdir(), 'lanpm-db-'))
  const dbPath = join(dir, 'lanpm.db')
  try {
    const db = new Database(dbPath)
    db.pragma('foreign_keys = ON')
    fn(db, dbPath)
    db.close()
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/** v0 → SCHEMA_VERSION via applyMigrations */
withTempDb((db) => {
  applyMigrations(db)
  const v = db.pragma('user_version', { simple: true }) as number
  if (v !== SCHEMA_VERSION) {
    throw new Error(`expected user_version=${SCHEMA_VERSION} after bootstrap, got ${v}`)
  }
  assertTables(db)

  const now = new Date().toISOString()
  const userId = 'test-user-2401'
  const deviceId = 'test-device-001'
  db.prepare(
    `INSERT INTO users (user_id, display_name, base_name, suffix, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(userId, '测试-2401', '测试', '-2401', now, now)
  db.prepare(
    `INSERT INTO devices (device_id, user_id, device_name, last_seen_at)
     VALUES (?, ?, ?, ?)`
  ).run(deviceId, userId, '验证机', now)
  const user = db.prepare('SELECT user_id FROM users WHERE user_id = ?').get(userId)
  const device = db.prepare('SELECT device_id FROM devices WHERE device_id = ?').get(deviceId)
  if (!user || !device) throw new Error('users/devices round-trip failed')
  console.log(
    'OK: bootstrap v0→%d (%d tables), userId=%s, deviceId=%s',
    SCHEMA_VERSION,
    EXPECTED_TABLES.length,
    userId,
    deviceId
  )
})

/** Already at SCHEMA_VERSION → idempotent */
withTempDb((db) => {
  applyMigrations(db)
  applyMigrations(db)
  const v = db.pragma('user_version', { simple: true }) as number
  if (v !== SCHEMA_VERSION) throw new Error(`idempotent open: expected ${SCHEMA_VERSION}, got ${v}`)
  assertTables(db)
  console.log('OK: idempotent applyMigrations at v%d', SCHEMA_VERSION)
})

/** user_version newer than app → throw */
withTempDb((db) => {
  db.pragma(`user_version = ${SCHEMA_VERSION + 99}`)
  let threw = false
  try {
    applyMigrations(db)
  } catch (e) {
    threw = e instanceof Error && e.message.includes('newer than app')
  }
  if (!threw) throw new Error('expected throw when user_version > SCHEMA_VERSION')
  console.log('OK: reject newer user_version')
})

if (MIGRATIONS.length > 0) {
  console.log('OK: MIGRATIONS registered=%d', MIGRATIONS.length)
} else {
  console.log('OK: MIGRATIONS empty (SCHEMA_VERSION=%d skeleton)', SCHEMA_VERSION)
}

console.log('verify:storage OK')
