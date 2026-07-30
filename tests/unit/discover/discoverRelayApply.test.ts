import { describe, expect, it } from 'vitest'
import {
  applyRelayGroups,
  collectNewSeedAddresses,
  relayPacketForForward
} from '../../../src/main/network/real/discoverRelayApply.ts'
import { listCachedDiscoverGroups } from '../../../src/main/discover/discoverGroupRegistry.ts'

describe('discoverRelayApply', () => {
  it('applyRelayGroups writes owner metadata', () => {
    applyRelayGroups([
      {
        groupId: 'g_relay',
        name: 'Relay Group',
        type: 'project',
        ownerUserId: 'owner_1',
        ownerDisplayName: 'Owner One'
      }
    ])
    const cached = listCachedDiscoverGroups()
    expect(cached.some((c) => c.advert.groupId === 'g_relay' && c.ownerUserId === 'owner_1')).toBe(
      true
    )
  })

  it('collectNewSeedAddresses dedupes', () => {
    const known = new Set<string>(['127.0.0.1:43124'])
    const next = collectNewSeedAddresses(['127.0.0.1:43124', '127.0.0.1:43125'], known)
    expect(next).toEqual(['127.0.0.1:43125'])
    expect(known.has('127.0.0.1:43125')).toBe(true)
  })

  it('relayPacketForForward decrements hop and sets viaDeviceId', () => {
    const forward = relayPacketForForward(
      {
        v: 1,
        kind: 'discover_relay',
        hop: 2,
        viaDeviceId: 'dev_a',
        peers: [],
        groups: []
      },
      'dev_b'
    )
    expect(forward?.hop).toBe(1)
    expect(forward?.viaDeviceId).toBe('dev_b')
    expect(relayPacketForForward({ ...forward!, hop: 0 }, 'dev_c')).toBeNull()
  })
})
