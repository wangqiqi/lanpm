import { describe, expect, it } from 'vitest'
import {
  aggregateUserPresence,
  aggregateUserPresenceFromDevices,
  presenceEmoji,
  presenceLabel
} from '@shared/presence'

describe('presence barrel exports', () => {
  it('re-exports aggregate and display helpers', () => {
    expect(aggregateUserPresence(['online'])).toBe('online')
    expect(presenceEmoji('online')).toBeTruthy()
    expect(presenceLabel('offline')).toBeTruthy()
    expect(
      aggregateUserPresenceFromDevices(
        [{ userId: 'u1', deviceId: 'd1', presence: 'online', updatedAt: Date.now() }],
        'u1',
        Date.now(),
        60_000
      )
    ).toBe('online')
  })
})
