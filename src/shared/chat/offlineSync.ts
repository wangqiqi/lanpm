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
}

export function offlineSyncCutoffIso(ttlDays = OFFLINE_SYNC_TTL_DAYS): string {
  return new Date(Date.now() - ttlDays * 24 * 60 * 60 * 1000).toISOString()
}
