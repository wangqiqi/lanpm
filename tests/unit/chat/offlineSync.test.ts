import { describe, expect, it } from 'vitest'
import { OFFLINE_SYNC_TTL_DAYS, offlineSyncCutoffIso } from '@shared/chat/offlineSync'

describe('offlineSyncCutoffIso', () => {
  it('returns ISO timestamp within TTL window', () => {
    const cutoff = offlineSyncCutoffIso(OFFLINE_SYNC_TTL_DAYS)
    expect(cutoff < new Date().toISOString()).toBe(true)
    const daysAgo = (Date.now() - Date.parse(cutoff)) / (24 * 60 * 60 * 1000)
    expect(daysAgo).toBeGreaterThanOrEqual(OFFLINE_SYNC_TTL_DAYS - 0.01)
    expect(daysAgo).toBeLessThanOrEqual(OFFLINE_SYNC_TTL_DAYS + 0.01)
  })
})
