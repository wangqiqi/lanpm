/**
 * Seed demo-project chat to ≥100 messages for measure:perf --memory.
 * Env: LANPM_MEASURE_USER_DATA
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import Database from 'better-sqlite3'

const userData = process.env.LANPM_MEASURE_USER_DATA
if (!userData) {
  console.error('LANPM_MEASURE_USER_DATA required')
  process.exit(1)
}
const dbPath = join(userData, 'lanpm.db')
if (!existsSync(dbPath)) {
  console.error(`missing ${dbPath}`)
  process.exit(1)
}

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
const row = db.prepare(`SELECT COUNT(*) AS c FROM messages WHERE group_id = ?`).get('demo-project') as {
  c: number
}
const need = Math.max(0, 100 - (row?.c ?? 0))
const now = new Date().toISOString()
const insert = db.prepare(
  `INSERT INTO messages (
    msg_id, group_id, sender_user_id, sender_device_id, type, content_json,
    lamport_ts, created_at, delivery_status
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
)
const maxTs = db
  .prepare(`SELECT COALESCE(MAX(lamport_ts), 0) AS m FROM messages WHERE group_id = ?`)
  .get('demo-project') as { m: number }
let ts = maxTs.m
for (let i = 0; i < need; i++) {
  ts += 1
  insert.run(
    `perf_seed_${randomUUID()}`,
    'demo-project',
    'user_perf',
    'dev_perf',
    'text',
    JSON.stringify({ kind: 'text', text: `perf-seed ${i}` }),
    ts,
    now,
    'sent'
  )
}
db.close()
console.log(`measure-seed-chat: demo-project now >=100 (inserted ${need})`)
