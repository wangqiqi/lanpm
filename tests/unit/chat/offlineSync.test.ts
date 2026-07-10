import { describe, expect, it } from 'vitest'
import {
  OFFLINE_SYNC_BATCH_LIMIT,
  OFFLINE_SYNC_META_KEY,
  OFFLINE_SYNC_TTL_DAYS,
  maxLamportInMessages,
  offlineSyncCutoffIso,
  splitOfflineSyncPage
} from '@shared/chat/offlineSync'
import type { ChatMessage } from '@shared/chat/types'

function msg(lamportTs: number): ChatMessage {
  return {
    msgId: `m${lamportTs}`,
    groupId: 'g',
    senderUserId: 'u',
    senderDeviceId: 'd',
    type: 'text',
    content: { kind: 'text', text: String(lamportTs) },
    lamportTs,
    createdAt: new Date().toISOString(),
    deliveryStatus: 'sent'
  }
}

describe('offline sync constants', () => {
  it('documents TTL, batch limit, and meta key', () => {
    expect(OFFLINE_SYNC_TTL_DAYS).toBe(7)
    expect(OFFLINE_SYNC_BATCH_LIMIT).toBe(100)
    expect(OFFLINE_SYNC_META_KEY).toBe('sync_meta.message_ttl_days')
  })
})

describe('offlineSyncCutoffIso', () => {
  it('returns ISO timestamp within TTL window', () => {
    const cutoff = offlineSyncCutoffIso(OFFLINE_SYNC_TTL_DAYS)
    expect(cutoff < new Date().toISOString()).toBe(true)
    const daysAgo = (Date.now() - Date.parse(cutoff)) / (24 * 60 * 60 * 1000)
    expect(daysAgo).toBeGreaterThanOrEqual(OFFLINE_SYNC_TTL_DAYS - 0.01)
    expect(daysAgo).toBeLessThanOrEqual(OFFLINE_SYNC_TTL_DAYS + 0.01)
  })
})

describe('splitOfflineSyncPage', () => {
  it('marks hasMore when rows exceed limit', () => {
    const rows = Array.from({ length: 5 }, (_, i) => msg(i + 1))
    const page = splitOfflineSyncPage(rows, 3)
    expect(page.messages).toHaveLength(3)
    expect(page.hasMore).toBe(true)
    expect(page.messages.map((m) => m.lamportTs)).toEqual([1, 2, 3])
  })

  it('hasMore false when rows fit in one page', () => {
    const rows = [msg(1), msg(2)]
    expect(splitOfflineSyncPage(rows, 3)).toEqual({ messages: rows, hasMore: false })
  })
})

describe('maxLamportInMessages', () => {
  it('returns the highest lamportTs', () => {
    expect(maxLamportInMessages([msg(2), msg(9), msg(4)])).toBe(9)
    expect(maxLamportInMessages([])).toBe(0)
  })
})
