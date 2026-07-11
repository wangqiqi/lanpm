import type { SyncMessageType } from '../network/types.ts'

/** Channels eligible for durable publish retry (B4 outbox). */
export type SyncOutboxChannel =
  | Extract<
      SyncMessageType,
      'task_patch' | 'task_dep_patch' | 'file_meta' | 'group_tag_patch'
    >

export interface SyncOutboxRow {
  id: string
  channel: SyncOutboxChannel
  groupId: string
  /** Unique with channel — newer enqueue replaces older pending row. */
  dedupeKey: string
  /** JSON SyncEnvelope ready to re-publish (nonce/authTag may be empty). */
  envelopeJson: string
  attempts: number
  nextAttemptAt: string
  lastError: string | null
  createdAt: string
  updatedAt: string
}

export interface SyncOutboxEnqueueInput {
  channel: SyncOutboxChannel
  groupId: string
  dedupeKey: string
  envelopeJson: string
  /** Optional seed id; otherwise store generates. */
  id?: string
}

/** Cap retries so a poison message cannot spin forever. */
export const SYNC_OUTBOX_MAX_ATTEMPTS = 20

/** Default / max page size for listDueSyncOutbox. */
export const SYNC_OUTBOX_LIST_DEFAULT_LIMIT = 50
export const SYNC_OUTBOX_LIST_MAX_LIMIT = 500

/** Base backoff 1s · doubles · capped at 5 min. */
export const SYNC_OUTBOX_BACKOFF_BASE_MS = 1000
export const SYNC_OUTBOX_BACKOFF_MAX_MS = 5 * 60 * 1000

/** ≤0 / 非有限 → default；超过 MAX → MAX */
export function clampSyncOutboxListLimit(limit: number | null | undefined): number {
  if (typeof limit !== 'number' || !Number.isFinite(limit) || limit <= 0) {
    return SYNC_OUTBOX_LIST_DEFAULT_LIMIT
  }
  return Math.min(SYNC_OUTBOX_LIST_MAX_LIMIT, Math.floor(limit))
}

export function outboxBackoffMs(attempts: number): number {
  const n = Math.max(0, Math.floor(attempts))
  const raw = SYNC_OUTBOX_BACKOFF_BASE_MS * 2 ** n
  return Math.min(SYNC_OUTBOX_BACKOFF_MAX_MS, raw)
}

export function outboxNextAttemptAt(attempts: number, nowMs = Date.now()): string {
  return new Date(nowMs + outboxBackoffMs(attempts)).toISOString()
}

export function isSyncOutboxChannel(value: string): value is SyncOutboxChannel {
  return (
    value === 'task_patch' ||
    value === 'task_dep_patch' ||
    value === 'file_meta' ||
    value === 'group_tag_patch'
  )
}
