import type { ChatMessage } from '../chat/types'

/** docs/04 §12 — 离线消息保留窗口（天） */
export const OFFLINE_SYNC_TTL_DAYS = 7

export const OFFLINE_SYNC_BATCH_LIMIT = 100

export const OFFLINE_SYNC_META_KEY = 'sync_meta.message_ttl_days'

export interface ChatSyncRequestPayload {
  sinceLamportTs: number
  minCreatedAt: string
}

export interface ChatSyncBatchPayload {
  messages: ChatMessage[]
  /** True when more messages remain after this page (TASK-132) */
  hasMore?: boolean
}

export function offlineSyncCutoffIso(ttlDays = OFFLINE_SYNC_TTL_DAYS): string {
  return new Date(Date.now() - ttlDays * 24 * 60 * 60 * 1000).toISOString()
}

/** Peek one past the page to decide hasMore without a second query. */
export function splitOfflineSyncPage(
  rows: ChatMessage[],
  limit = OFFLINE_SYNC_BATCH_LIMIT
): { messages: ChatMessage[]; hasMore: boolean } {
  if (rows.length > limit) {
    return { messages: rows.slice(0, limit), hasMore: true }
  }
  return { messages: rows, hasMore: false }
}

export function maxLamportInMessages(messages: ChatMessage[]): number {
  let max = 0
  for (const m of messages) {
    if (m.lamportTs > max) max = m.lamportTs
  }
  return max
}
