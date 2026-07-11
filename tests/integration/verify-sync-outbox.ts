/**
 * TASK-300 — sync_outbox schema + enqueue/ack/backoff.
 * Run: npm run verify:sync-outbox
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { projectRoot } from '../projectRoot.ts'
import { applyMigrations } from '../../src/main/storage/migrate.ts'
import { EXPECTED_TABLES, SCHEMA_VERSION } from '../../src/main/storage/schema.ts'
import {
  ackSyncOutbox,
  bumpSyncOutboxAttempt,
  enqueueSyncOutbox,
  listDueSyncOutbox
} from '../../src/main/sync/outboxStore.ts'
import {
  clampSyncOutboxListLimit,
  outboxBackoffMs,
  SYNC_OUTBOX_BACKOFF_BASE_MS,
  SYNC_OUTBOX_BACKOFF_MAX_MS,
  SYNC_OUTBOX_LIST_DEFAULT_LIMIT,
  SYNC_OUTBOX_LIST_MAX_LIMIT,
  SYNC_OUTBOX_MAX_ATTEMPTS
} from '../../src/shared/sync/outbox.ts'
import { mkLanpmTemp, rmLanpmTemp } from '../lanpmTemp.ts'

const root = projectRoot

assert.equal(SCHEMA_VERSION, 11)
assert.ok(EXPECTED_TABLES.includes('sync_outbox'))

const schemaSql = readFileSync(join(root, 'src/main/storage/schema.sql'), 'utf8')
assert.match(schemaSql, /CREATE TABLE sync_outbox/)
assert.match(schemaSql, /UNIQUE \(channel, dedupe_key\)/)

const migrateSrc = readFileSync(join(root, 'src/main/storage/migrate.ts'), 'utf8')
assert.match(migrateSrc, /fromVersion:\s*10/)
assert.match(migrateSrc, /sync_outbox/)

assert.equal(outboxBackoffMs(0), SYNC_OUTBOX_BACKOFF_BASE_MS)
assert.equal(outboxBackoffMs(1), SYNC_OUTBOX_BACKOFF_BASE_MS * 2)
assert.equal(outboxBackoffMs(20), SYNC_OUTBOX_BACKOFF_MAX_MS)
assert.ok(SYNC_OUTBOX_MAX_ATTEMPTS >= 10)
assert.equal(clampSyncOutboxListLimit(undefined), SYNC_OUTBOX_LIST_DEFAULT_LIMIT)
assert.equal(clampSyncOutboxListLimit(0), SYNC_OUTBOX_LIST_DEFAULT_LIMIT)
assert.equal(clampSyncOutboxListLimit(SYNC_OUTBOX_LIST_MAX_LIMIT + 99), SYNC_OUTBOX_LIST_MAX_LIMIT)

const storeSrc = readFileSync(join(root, 'src/main/sync/outboxStore.ts'), 'utf8')
assert.match(storeSrc, /clampSyncOutboxListLimit/, 'listDueSyncOutbox must clamp limit')

const dir = mkLanpmTemp('lanpm-outbox-')
try {
  const db = new Database(join(dir, 'lanpm.db'))
  db.pragma('foreign_keys = ON')
  applyMigrations(db)
  assert.equal(db.pragma('user_version', { simple: true }), 11)

  const t0 = Date.parse('2026-07-11T12:00:00.000Z')
  const first = enqueueSyncOutbox(db, {
    channel: 'task_patch',
    groupId: 'g1',
    dedupeKey: 'task:t1',
    envelopeJson: JSON.stringify({ type: 'task_patch', msgId: 'm1' }),
    id: 'ob-1'
  })
  assert.equal(first.attempts, 0)
  assert.ok(first.nextAttemptAt >= new Date(t0).toISOString().slice(0, 10))

  const replaced = enqueueSyncOutbox(db, {
    channel: 'task_patch',
    groupId: 'g1',
    dedupeKey: 'task:t1',
    envelopeJson: JSON.stringify({ type: 'task_patch', msgId: 'm2' }),
    id: 'ob-2'
  })
  assert.equal(replaced.id, 'ob-2')
  assert.equal(JSON.parse(replaced.envelopeJson).msgId, 'm2')

  const dueNow = listDueSyncOutbox(db, { nowIso: '2099-01-01T00:00:00.000Z', limit: 10 })
  assert.equal(dueNow.length, 1)

  const bumped = bumpSyncOutboxAttempt(db, 'ob-2', new Error('net down'), t0)
  assert.ok(bumped)
  assert.equal(bumped.attempts, 1)
  assert.match(bumped.lastError ?? '', /net down/)

  const notYet = listDueSyncOutbox(db, {
    nowIso: new Date(t0).toISOString(),
    limit: 10
  })
  assert.equal(notYet.length, 0, 'backoff should delay immediate re-due')

  const later = listDueSyncOutbox(db, {
    nowIso: bumped.nextAttemptAt,
    limit: 10
  })
  assert.equal(later.length, 1)

  ackSyncOutbox(db, 'ob-2')
  assert.equal(listDueSyncOutbox(db, { nowIso: '2099-01-01T00:00:00.000Z' }).length, 0)

  db.close()
} finally {
  rmLanpmTemp(dir)
}

const taskSync = readFileSync(join(root, 'src/main/task/taskSyncService.ts'), 'utf8')
assert.match(taskSync, /enqueueFailedPublish/)
assert.match(taskSync, /channel: 'task_patch'/)
assert.match(taskSync, /channel: 'task_dep_patch'/)

const fileSync = readFileSync(join(root, 'src/main/file/fileSyncService.ts'), 'utf8')
assert.match(fileSync, /enqueueFailedPublish/)
assert.match(fileSync, /channel: 'file_meta'/)

const groupTag = readFileSync(join(root, 'src/main/task/groupTagSyncService.ts'), 'utf8')
assert.match(groupTag, /enqueueFailedPublish/)
assert.match(groupTag, /channel: 'group_tag_patch'/)

const flushSrc = readFileSync(join(root, 'src/main/sync/outboxFlushService.ts'), 'utf8')
assert.match(flushSrc, /export async function flushSyncOutbox/)
assert.match(flushSrc, /initSyncOutboxFlush/)
assert.match(flushSrc, /requestSyncOutboxFlush/)

const taskSyncInit = readFileSync(join(root, 'src/main/task/taskSyncService.ts'), 'utf8')
assert.match(taskSyncInit, /initSyncOutboxFlush/)
assert.match(taskSyncInit, /shutdownSyncOutboxFlush/)

const netIpc = readFileSync(join(root, 'src/main/ipc/network.ts'), 'utf8')
assert.match(netIpc, /requestSyncOutboxFlush/)

console.log('verify:sync-outbox OK')
