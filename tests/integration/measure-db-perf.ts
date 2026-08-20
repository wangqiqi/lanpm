/**
 * Plain vs SQLCipher listMessages timing for measure:perf --db.
 * Prints one JSON line when LANPM_MEASURE_DB_JSON=1.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import Database from 'better-sqlite3'
import { projectRoot } from '../projectRoot.ts'
import { mkLanpmTemp, rmLanpmTemp } from '../lanpmTemp.ts'
import {
  encryptExistingPlainDatabase,
  openSqliteDatabase
} from '../../src/main/storage/sqliteAtRest.ts'
import { listRecentMessagesPage } from '../../src/main/storage/repositories/messageRepository.ts'

const schemaSql = readFileSync(join(projectRoot, 'src/main/storage/schema.sql'), 'utf8')
const dir = mkLanpmTemp('lanpm-measure-db-')
const dbPath = join(dir, 'lanpm.db')
const GROUP = 'perf-messages'
const PASSPHRASE = 'measure-perf-passphrase'
const now = new Date().toISOString()

function seedMessages(db: Database.Database, n: number): void {
  const insert = db.prepare(
    `INSERT INTO messages (
      msg_id, group_id, sender_user_id, sender_device_id, type, content_json,
      lamport_ts, created_at, delivery_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
  for (let i = 0; i < n; i++) {
    insert.run(
      `msg_m_${i}_${randomUUID()}`,
      GROUP,
      'user_perf',
      'dev_perf',
      'text',
      JSON.stringify({ kind: 'text', text: `perf ${i}` }),
      i + 1,
      now,
      'sent'
    )
  }
}

function timeList(db: Database.Database, rounds: number): number {
  const samples: number[] = []
  for (let i = 0; i < rounds; i++) {
    const s = performance.now()
    listRecentMessagesPage(db, GROUP, 200)
    samples.push(performance.now() - s)
  }
  const sorted = [...samples].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)
  return sorted[Math.max(0, idx)] ?? 0
}

try {
  let db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.exec(schemaSql)
  seedMessages(db, 500)
  const dbPlainMs = timeList(db, 80)
  db.close()

  encryptExistingPlainDatabase(dbPath, PASSPHRASE)
  db = openSqliteDatabase(dbPath, PASSPHRASE)
  db.pragma('journal_mode = WAL')
  const dbCipherMs = timeList(db, 80)
  db.close()

  const payload = {
    dbPlainMs: Math.round(dbPlainMs * 1000) / 1000,
    dbCipherMs: Math.round(dbCipherMs * 1000) / 1000
  }
  const outFile = process.env.LANPM_MEASURE_DB_OUT
  if (outFile) {
    writeFileSync(outFile, `${JSON.stringify(payload)}\n`, 'utf8')
  }
  if (process.env.LANPM_MEASURE_DB_JSON === '1' && !outFile) {
    console.log(JSON.stringify(payload))
  } else {
    console.log(`measure-db-perf: plain=${payload.dbPlainMs}ms cipher=${payload.dbCipherMs}ms`)
  }
} finally {
  rmLanpmTemp(dir)
}
