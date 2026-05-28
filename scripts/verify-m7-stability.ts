/**
 * M7-03 稳定性：SQLite 崩溃恢复 / 会话数据持久化。
 * Run: npm run verify:m7-stability
 */
import assert from 'node:assert/strict'
import Database from 'better-sqlite3'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const schemaSql = readFileSync(join(root, 'src/main/storage/schema.sql'), 'utf8')

function createFreshDb(path: string): Database.Database {
  const db = new Database(path)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(schemaSql)
  db.pragma('user_version = 1')
  return db
}

function reopenDb(path: string): Database.Database {
  const db = new Database(path)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  return db
}

const dir = mkdtempSync(join(tmpdir(), 'lanpm-m7-stab-'))
const dbPath = join(dir, 'lanpm.db')

try {
  const db1 = createFreshDb(dbPath)
  const now = new Date().toISOString()
  db1.prepare(
    `INSERT INTO users (user_id, display_name, base_name, suffix, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run('u1', 'Tester', 'Tester', null, now, now)
  db1.prepare(
    `INSERT INTO devices (device_id, user_id, device_name, last_seen_at) VALUES (?, ?, ?, ?)`
  ).run('d1', 'u1', 'Dev', now)
  db1.prepare(
    `INSERT INTO messages (
      msg_id, group_id, sender_user_id, sender_device_id, type, content_json,
      lamport_ts, created_at, delivery_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    'msg_1',
    'demo-project',
    'u1',
    'd1',
    'text',
    JSON.stringify({ kind: 'text', text: 'persist me' }),
    1,
    now,
    'sent'
  )
  db1.prepare(`INSERT INTO sync_meta (key, value) VALUES (?, ?)`).run('local_device_id', 'd1')
  db1.close()

  const db2 = reopenDb(dbPath)
  const msg = db2.prepare(`SELECT content_json FROM messages WHERE msg_id = ?`).get('msg_1') as
    | { content_json: string }
    | undefined
  assert.ok(msg)
  const parsed = JSON.parse(msg.content_json) as { text?: string }
  assert.equal(parsed.text, 'persist me')

  const meta = db2.prepare(`SELECT value FROM sync_meta WHERE key = ?`).get('local_device_id') as
    | { value: string }
    | undefined
  assert.equal(meta?.value, 'd1')
  db2.close()

  console.log('verify-m7-stability: ok')
} finally {
  rmSync(dir, { recursive: true, force: true })
}
