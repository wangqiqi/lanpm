/**
 * M7-02 性能冒烟（Node 侧可自动化部分，完整冷启动/内存见 docs/06 §3 手测）。
 * Run: npm run verify:m7-perf
 */
import assert from 'node:assert/strict'
import Database from 'better-sqlite3'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { generateDhKeyPair, deriveSharedSecret, deriveAesKey } from '../../src/main/crypto/dhSession.ts'
import { sealEnvelope, openEnvelope } from '../../src/main/crypto/envelopeCrypto.ts'
import { groupViewPath } from '../../src/renderer/src/routes/paths.ts'
import type { SyncEnvelope } from '../../src/shared/network/types.ts'
import { listMessagesByGroup } from '../../src/main/storage/repositories/messageRepository.ts'

function p95(samples: number[]): number {
  const sorted = [...samples].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)
  return sorted[Math.max(0, idx)] ?? 0
}

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const schemaSql = readFileSync(join(root, 'src/main/storage/schema.sql'), 'utf8')

const dir = mkdtempSync(join(tmpdir(), 'lanpm-m7-perf-'))
const dbPath = join(dir, 'lanpm.db')

try {
  const t0 = performance.now()
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.exec(schemaSql)
  for (let i = 0; i < 100; i++) {
    db.prepare(
      `INSERT INTO sync_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    ).run(`k${i}`, `v${i}`)
  }
  const dbInitMs = performance.now() - t0
  assert.ok(dbInitMs < 800, `schema+100 writes took ${dbInitMs.toFixed(1)}ms (limit 800ms)`)

  const a = generateDhKeyPair()
  const b = generateDhKeyPair()
  const aes = deriveAesKey(deriveSharedSecret(a.privateKey, b.publicKey))
  const env: SyncEnvelope = {
    version: 1,
    type: 'chat',
    msgId: 'm1',
    senderUserId: 'u',
    senderDeviceId: 'd',
    groupId: 'g',
    ts: new Date().toISOString(),
    payload: { text: 'perf' },
    nonce: '',
    authTag: ''
  }

  const cryptoSamples: number[] = []
  for (let i = 0; i < 200; i++) {
    const s = performance.now()
    const sealed = sealEnvelope(aes, env)
    openEnvelope(aes, sealed)
    cryptoSamples.push(performance.now() - s)
  }
  const cryptoP95 = p95(cryptoSamples)
  assert.ok(cryptoP95 < 5, `crypto P95 ${cryptoP95.toFixed(2)}ms (limit 5ms)`)

  const routeSamples: number[] = []
  for (let i = 0; i < 5000; i++) {
    const s = performance.now()
    groupViewPath('demo-project', 'chat')
    routeSamples.push(performance.now() - s)
  }
  const routeP95 = p95(routeSamples)
  assert.ok(routeP95 < 1, `route P95 ${routeP95.toFixed(3)}ms (limit 1ms)`)

  const GROUP = 'perf-messages'
  const now = new Date().toISOString()
  const insertStmt = db.prepare(
    `INSERT INTO messages (
      msg_id, group_id, sender_user_id, sender_device_id, type, content_json,
      lamport_ts, created_at, delivery_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
  for (let i = 0; i < 500; i++) {
    insertStmt.run(
      `msg_perf_${i}_${randomUUID()}`,
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

  const msgSamples: number[] = []
  for (let i = 0; i < 200; i++) {
    const s = performance.now()
    listMessagesByGroup(db, GROUP, 200)
    msgSamples.push(performance.now() - s)
  }
  const msgP95 = p95(msgSamples)
  assert.ok(msgP95 < 15, `message page P95 ${msgP95.toFixed(2)}ms (limit 15ms)`)

  db.close()

  console.log(
    `verify-m7-perf: ok (db=${dbInitMs.toFixed(1)}ms cryptoP95=${cryptoP95.toFixed(2)}ms routeP95=${routeP95.toFixed(3)}ms msgP95=${msgP95.toFixed(2)}ms)`
  )
} finally {
  rmSync(dir, { recursive: true, force: true })
}
