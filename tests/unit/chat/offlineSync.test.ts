import { describe, expect, it } from 'vitest'
import {
  OFFLINE_SYNC_BATCH_LIMIT,
  OFFLINE_SYNC_META_KEY,
  OFFLINE_SYNC_TTL_DAYS,
  offlineSyncCutoffIso
} from '@shared/chat/offlineSync'

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
