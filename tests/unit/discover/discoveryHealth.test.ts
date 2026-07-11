import { describe, expect, it } from 'vitest'
import {
  evaluateDiscoveryHealth,
  shouldSuggestManualPeer
} from '@shared/discover/discoveryHealth'

describe('evaluateDiscoveryHealth', () => {
  it('reports ok when peers present', () => {
    const h = evaluateDiscoveryHealth({
      mode: 'real',
      bindOk: true,
      multicastOk: true,
      peerCount: 2,
      groupCount: 1
    })
    expect(h).toEqual({ reason: 'ok', ok: true, suggestManualPeer: false })
    expect(shouldSuggestManualPeer(h)).toBe(false)
  })

  it('suggests manual peer when empty but bind ok', () => {
    const h = evaluateDiscoveryHealth({
      mode: 'real',
      bindOk: true,
      multicastOk: true,
      peerCount: 0,
      groupCount: 0
    })
    expect(h.reason).toBe('transport_offline')
    expect(h.suggestManualPeer).toBe(true)
  })

  it('flags bind failure', () => {
    const h = evaluateDiscoveryHealth({
      mode: 'real',
      bindOk: false,
      multicastOk: null,
      peerCount: 0,
      groupCount: 0
    })
    expect(h).toEqual({ reason: 'bind_failed', ok: false, suggestManualPeer: true })
  })

  it('soft-flags multicast degradation when peers exist', () => {
    const h = evaluateDiscoveryHealth({
      mode: 'real',
      bindOk: true,
      multicastOk: false,
      peerCount: 1,
      groupCount: 0
    })
    expect(h.reason).toBe('multicast_degraded')
    expect(h.ok).toBe(true)
  })

  it('stub mode empty suggests manual peer', () => {
    const h = evaluateDiscoveryHealth({
      mode: 'stub',
      bindOk: true,
      multicastOk: null,
      peerCount: 0,
      groupCount: 0
    })
    expect(h.reason).toBe('stub_mode')
    expect(h.suggestManualPeer).toBe(true)
  })
})
