import { randomUUID } from 'node:crypto'
import type { Database } from 'better-sqlite3'
import {
  clampSyncOutboxListLimit,
  isSyncOutboxChannel,
  outboxNextAttemptAt,
  SYNC_OUTBOX_MAX_ATTEMPTS,
  type SyncOutboxChannel,
  type SyncOutboxEnqueueInput,
  type SyncOutboxRow
} from '../../shared/sync/outbox.ts'

type OutboxDbRow = {
  id: string
  channel: string
  group_id: string
  dedupe_key: string
  envelope_json: string
  attempts: number
  next_attempt_at: string
  last_error: string | null
  created_at: string
  updated_at: string
}

function mapRow(row: OutboxDbRow): SyncOutboxRow {
  if (!isSyncOutboxChannel(row.channel)) {
    throw new Error(`invalid sync_outbox channel: ${row.channel}`)
  }
  return {
    id: row.id,
    channel: row.channel,
    groupId: row.group_id,
    dedupeKey: row.dedupe_key,
    envelopeJson: row.envelope_json,
    attempts: row.attempts,
    nextAttemptAt: row.next_attempt_at,
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

/** Insert or replace by (channel, dedupe_key). Attempts reset on replace. */
export function enqueueSyncOutbox(db: Database, input: SyncOutboxEnqueueInput): SyncOutboxRow {
  const now = new Date().toISOString()
  const id = input.id ?? randomUUID()
  const nextAttemptAt = outboxNextAttemptAt(0, Date.parse(now))

  db.prepare(
    `INSERT INTO sync_outbox (
      id, channel, group_id, dedupe_key, envelope_json,
      attempts, next_attempt_at, last_error, created_at, updated_at
    ) VALUES (
      @id, @channel, @group_id, @dedupe_key, @envelope_json,
      0, @next_attempt_at, NULL, @created_at, @updated_at
    )
    ON CONFLICT(channel, dedupe_key) DO UPDATE SET
      id = excluded.id,
      group_id = excluded.group_id,
      envelope_json = excluded.envelope_json,
      attempts = 0,
      next_attempt_at = excluded.next_attempt_at,
      last_error = NULL,
      updated_at = excluded.updated_at`
  ).run({
    id,
    channel: input.channel,
    group_id: input.groupId,
    dedupe_key: input.dedupeKey,
    envelope_json: input.envelopeJson,
    next_attempt_at: nextAttemptAt,
    created_at: now,
    updated_at: now
  })

  const row = db
    .prepare(
      `SELECT id, channel, group_id, dedupe_key, envelope_json, attempts,
              next_attempt_at, last_error, created_at, updated_at
       FROM sync_outbox WHERE channel = ? AND dedupe_key = ?`
    )
    .get(input.channel, input.dedupeKey) as OutboxDbRow | undefined

  if (!row) throw new Error('enqueueSyncOutbox: row missing after upsert')
  return mapRow(row)
}

/** Rows due for retry (next_attempt_at <= now), oldest first. */
export function listDueSyncOutbox(
  db: Database,
  opts?: { nowIso?: string; limit?: number; channel?: SyncOutboxChannel }
): SyncOutboxRow[] {
  const nowIso = opts?.nowIso ?? new Date().toISOString()
  const limit = clampSyncOutboxListLimit(opts?.limit)
  const rows = opts?.channel
    ? (db
        .prepare(
          `SELECT id, channel, group_id, dedupe_key, envelope_json, attempts,
                  next_attempt_at, last_error, created_at, updated_at
           FROM sync_outbox
           WHERE channel = ? AND next_attempt_at <= ? AND attempts < ?
           ORDER BY next_attempt_at ASC
           LIMIT ?`
        )
        .all(opts.channel, nowIso, SYNC_OUTBOX_MAX_ATTEMPTS, limit) as OutboxDbRow[])
    : (db
        .prepare(
          `SELECT id, channel, group_id, dedupe_key, envelope_json, attempts,
                  next_attempt_at, last_error, created_at, updated_at
           FROM sync_outbox
           WHERE next_attempt_at <= ? AND attempts < ?
           ORDER BY next_attempt_at ASC
           LIMIT ?`
        )
        .all(nowIso, SYNC_OUTBOX_MAX_ATTEMPTS, limit) as OutboxDbRow[])

  return rows.map(mapRow)
}

export function ackSyncOutbox(db: Database, id: string): void {
  db.prepare(`DELETE FROM sync_outbox WHERE id = ?`).run(id)
}

/** After failed flush: bump attempts and schedule next backoff. */
export function bumpSyncOutboxAttempt(
  db: Database,
  id: string,
  err: unknown,
  nowMs = Date.now()
): SyncOutboxRow | null {
  const existing = db
    .prepare(
      `SELECT id, channel, group_id, dedupe_key, envelope_json, attempts,
              next_attempt_at, last_error, created_at, updated_at
       FROM sync_outbox WHERE id = ?`
    )
    .get(id) as OutboxDbRow | undefined
  if (!existing) return null

  const attempts = existing.attempts + 1
  const nextAttemptAt = outboxNextAttemptAt(attempts, nowMs)
  const lastError = err instanceof Error ? err.message : String(err)
  const updatedAt = new Date(nowMs).toISOString()

  db.prepare(
    `UPDATE sync_outbox
     SET attempts = ?, next_attempt_at = ?, last_error = ?, updated_at = ?
     WHERE id = ?`
  ).run(attempts, nextAttemptAt, lastError.slice(0, 500), updatedAt, id)

  return mapRow({
    ...existing,
    attempts,
    next_attempt_at: nextAttemptAt,
    last_error: lastError.slice(0, 500),
    updated_at: updatedAt
  })
}

export function countSyncOutbox(db: Database): number {
  const row = db.prepare(`SELECT COUNT(*) AS n FROM sync_outbox`).get() as { n: number }
  return row.n
}
