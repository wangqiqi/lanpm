import type { Database } from 'better-sqlite3'
import type { SyncEnvelope } from '../../shared/network/types'
import { getNetworkTransport } from '../network'
import {
  ackSyncOutbox,
  bumpSyncOutboxAttempt,
  listDueSyncOutbox
} from './outboxStore'

const FLUSH_INTERVAL_MS = 15_000

let flushTimer: ReturnType<typeof setInterval> | null = null
let flushDb: Database | null = null
let flushing = false

export async function flushSyncOutbox(db: Database): Promise<{ flushed: number; failed: number }> {
  const transport = getNetworkTransport()
  if (!transport) return { flushed: 0, failed: 0 }

  const due = listDueSyncOutbox(db, { limit: 40 })
  let flushed = 0
  let failed = 0

  for (const row of due) {
    try {
      const envelope = JSON.parse(row.envelopeJson) as SyncEnvelope
      if (!envelope?.type || !envelope.msgId) {
        throw new Error('invalid outbox envelope')
      }
      await transport.publish(envelope)
      ackSyncOutbox(db, row.id)
      flushed++
    } catch (err) {
      bumpSyncOutboxAttempt(db, row.id, err)
      failed++
    }
  }
  return { flushed, failed }
}

async function tickFlush(): Promise<void> {
  if (flushing || !flushDb) return
  flushing = true
  try {
    await flushSyncOutbox(flushDb)
  } catch (err) {
    console.warn('[lanpm] syncOutbox.flush:', err instanceof Error ? err.message : err)
  } finally {
    flushing = false
  }
}

/** Start periodic flush; also runs once immediately. */
export function initSyncOutboxFlush(db: Database): void {
  flushDb = db
  if (flushTimer) clearInterval(flushTimer)
  flushTimer = setInterval(() => {
    void tickFlush()
  }, FLUSH_INTERVAL_MS)
  void tickFlush()
}

export function shutdownSyncOutboxFlush(): void {
  if (flushTimer) clearInterval(flushTimer)
  flushTimer = null
  flushDb = null
  flushing = false
}

/** Call after reconnect / transport rebuild. */
export function requestSyncOutboxFlush(): void {
  void tickFlush()
}
