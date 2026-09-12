import { describe, expect, it } from 'vitest'
import { includeDiscoveredPeer } from '../../../src/shared/discover/includeDiscoveredPeer'

describe('includeDiscoveredPeer', () => {
  it('drops probe and the local device', () => {
    expect(includeDiscoveredPeer({ userId: '__lanpm_probe__', deviceId: 'd2' }, { deviceId: 'd1' })).toBe(
      false
    )
    expect(includeDiscoveredPeer({ userId: 'u1', deviceId: 'd1' }, { deviceId: 'd1' })).toBe(false)
  })

  it('keeps another device of the same user', () => {
    expect(includeDiscoveredPeer({ userId: 'u1', deviceId: 'win' }, { deviceId: 'linux' })).toBe(true)
  })
})
