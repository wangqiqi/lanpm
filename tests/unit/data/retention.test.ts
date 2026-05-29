import { describe, expect, it } from 'vitest'
import {
  clampLocalRetentionDays,
  LEGACY_MESSAGE_TTL_META_KEY,
  LOCAL_RETENTION_DAYS_DEFAULT,
  LOCAL_RETENTION_DAYS_MAX,
  LOCAL_RETENTION_DAYS_MIN,
  LOCAL_RETENTION_META_KEY,
  retentionCutoffIso,
  SYNC_WINDOW_DAYS
} from '@shared/data/retention'

describe('retention constants', () => {
  it('exposes documented defaults', () => {
    expect(LOCAL_RETENTION_DAYS_DEFAULT).toBe(90)
    expect(LOCAL_RETENTION_DAYS_MIN).toBe(7)
    expect(LOCAL_RETENTION_DAYS_MAX).toBe(365)
    expect(SYNC_WINDOW_DAYS).toBe(7)
  })

  it('uses stable sync_meta keys', () => {
    expect(LOCAL_RETENTION_META_KEY).toBe('sync_meta.local_retention_days')
    expect(LEGACY_MESSAGE_TTL_META_KEY).toBe('sync_meta.message_ttl_days')
  })
})

describe('clampLocalRetentionDays', () => {
  it('clamps to min/max and floors', () => {
    expect(clampLocalRetentionDays(3)).toBe(LOCAL_RETENTION_DAYS_MIN)
    expect(clampLocalRetentionDays(999)).toBe(LOCAL_RETENTION_DAYS_MAX)
    expect(clampLocalRetentionDays(30.9)).toBe(30)
  })

  it('returns default for non-finite input', () => {
    expect(clampLocalRetentionDays(Number.NaN)).toBe(LOCAL_RETENTION_DAYS_DEFAULT)
    expect(clampLocalRetentionDays(Number.POSITIVE_INFINITY)).toBe(LOCAL_RETENTION_DAYS_DEFAULT)
  })
})

describe('retentionCutoffIso', () => {
  it('subtracts whole days from now', () => {
    const now = Date.parse('2026-05-29T12:00:00.000Z')
    const cutoff = retentionCutoffIso(7, now)
    expect(cutoff).toBe('2026-05-22T12:00:00.000Z')
  })
})
