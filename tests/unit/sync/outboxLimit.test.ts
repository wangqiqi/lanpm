import { describe, expect, it } from 'vitest'
import {
  clampSyncOutboxListLimit,
  SYNC_OUTBOX_LIST_DEFAULT_LIMIT,
  SYNC_OUTBOX_LIST_MAX_LIMIT
} from '@shared/sync/outbox'

describe('clampSyncOutboxListLimit', () => {
  it('keeps valid mid-range limits', () => {
    expect(clampSyncOutboxListLimit(10)).toBe(10)
    expect(clampSyncOutboxListLimit(SYNC_OUTBOX_LIST_MAX_LIMIT)).toBe(SYNC_OUTBOX_LIST_MAX_LIMIT)
  })

  it('floors fractional values', () => {
    expect(clampSyncOutboxListLimit(12.9)).toBe(12)
  })

  it('falls back to default for missing / non-positive / non-finite', () => {
    expect(clampSyncOutboxListLimit(undefined)).toBe(SYNC_OUTBOX_LIST_DEFAULT_LIMIT)
    expect(clampSyncOutboxListLimit(null)).toBe(SYNC_OUTBOX_LIST_DEFAULT_LIMIT)
    expect(clampSyncOutboxListLimit(0)).toBe(SYNC_OUTBOX_LIST_DEFAULT_LIMIT)
    expect(clampSyncOutboxListLimit(-5)).toBe(SYNC_OUTBOX_LIST_DEFAULT_LIMIT)
    expect(clampSyncOutboxListLimit(Number.NaN)).toBe(SYNC_OUTBOX_LIST_DEFAULT_LIMIT)
    expect(clampSyncOutboxListLimit(Number.POSITIVE_INFINITY)).toBe(SYNC_OUTBOX_LIST_DEFAULT_LIMIT)
  })

  it('clamps above max', () => {
    expect(clampSyncOutboxListLimit(SYNC_OUTBOX_LIST_MAX_LIMIT + 1)).toBe(SYNC_OUTBOX_LIST_MAX_LIMIT)
    expect(clampSyncOutboxListLimit(Number.MAX_SAFE_INTEGER)).toBe(SYNC_OUTBOX_LIST_MAX_LIMIT)
  })
})
