/**
 * Verifies SQLite schema + users/devices round-trip without Electron UI.
 * Run: npm run verify:storage
 */
import Database from 'better-sqlite3'
import { readFileSync, mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const schemaSql = readFileSync(join(root, 'src/main/storage/schema.sql'), 'utf8')

const EXPECTED_TABLES = [
  'users',
  'devices',
  'groups',
  'group_members',
  'messages',
  'read_receipts',
  'tasks',
  'task_dependencies',
  'files',
  'file_transfers',
  'ai_config',
  'sync_meta'
]

const dir = mkdtempSync(join(tmpdir(), 'lanpm-db-'))
const dbPath = join(dir, 'lanpm.db')

try {
  const db = new Database(dbPath)
  db.pragma('foreign_keys = ON')
  db.exec(schemaSql)
  db.pragma('user_version = 1')

  const tables = db
    .prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`
    )
    .all()
    .map((r) => r.name)
    .sort()

  const missing = EXPECTED_TABLES.filter((t) => !tables.includes(t))
  if (missing.length) {
    throw new Error(`Missing tables: ${missing.join(', ')}`)
  }

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

  if (!user || !device) {
    throw new Error('users/devices round-trip failed')
  }

  db.close()
  console.log('OK: schema (%d tables), userId=%s, deviceId=%s', tables.length, userId, deviceId)
} finally {
  rmSync(dir, { recursive: true, force: true })
}
