import { describe, expect, it } from 'vitest'
import {
  aggregateUserPresence,
  aggregateUserPresenceFromDevices,
  type DevicePresenceRecord
} from '@shared/presence/aggregate'

describe('aggregateUserPresence', () => {
  it('prefers online over away and offline', () => {
    expect(aggregateUserPresence(['offline', 'away', 'online'])).toBe('online')
    expect(aggregateUserPresence(['offline', 'away'])).toBe('away')
  })

  it('returns offline for empty input', () => {
    expect(aggregateUserPresence([])).toBe('offline')
  })
})

describe('aggregateUserPresenceFromDevices', () => {
  const now = 1_000_000
  const ttlMs = 60_000

  const devices: DevicePresenceRecord[] = [
    { userId: 'u1', deviceId: 'd1', presence: 'offline', updatedAt: now - 1000 },
    { userId: 'u1', deviceId: 'd2', presence: 'online', updatedAt: now - 2000 },
    { userId: 'u2', deviceId: 'd3', presence: 'online', updatedAt: now - 1000 }
  ]

  it('aggregates active devices for user', () => {
    expect(aggregateUserPresenceFromDevices(devices, 'u1', now, ttlMs)).toBe('online')
  })

  it('ignores stale devices', () => {
    const stale: DevicePresenceRecord[] = [
      { userId: 'u1', deviceId: 'd1', presence: 'online', updatedAt: now - ttlMs - 1 }
    ]
    expect(aggregateUserPresenceFromDevices(stale, 'u1', now, ttlMs)).toBe('offline')
  })
})
