import { describe, expect, it } from 'vitest'
import { collapseDiscoveredPeersOnePerHost } from '../../../src/shared/discover/collapsePeersByHost.ts'
import type { DiscoveryPayload } from '../../../src/shared/network/types'

function peer(
  deviceId: string,
  userId: string,
  host: string
): DiscoveryPayload {
  return {
    deviceId,
    userId,
    displayName: userId,
    listenPort: 43124,
    host,
    capabilities: ['chat']
  }
}

describe('collapseDiscoveredPeersOnePerHost', () => {
  it('keeps one peer per LAN host, preferring linked device', () => {
    const a = peer('d-old', 'user_old', '192.168.20.12')
    const b = peer('d-new', 'user_new', '192.168.20.12')
    const out = collapseDiscoveredPeersOnePerHost([a, b], (id) => id === 'd-new')
    expect(out).toHaveLength(1)
    expect(out[0].userId).toBe('user_new')
  })

  it('does not collapse loopback peers (integration tests)', () => {
    const a = peer('d1', 'u1', '127.0.0.1')
    const b = peer('d2', 'u2', '127.0.0.1')
    expect(collapseDiscoveredPeersOnePerHost([a, b], () => false)).toHaveLength(2)
  })
})
