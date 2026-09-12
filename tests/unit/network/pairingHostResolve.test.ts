import { describe, expect, it } from 'vitest'
import {
  buildPairingHostCandidates,
  hostTail,
  isHostTailSegment,
  listSubnetBroadcastAddresses
} from '../../../src/shared/network/pairingHostResolve'

describe('pairingHostResolve', () => {
  it('expands host tail across local subnets and seeds', () => {
    const candidates = buildPairingHostCandidates('109', {
      localLanIps: ['192.168.30.170'],
      seedHosts: ['192.168.20.50:43124']
    })
    expect(candidates).toEqual(['192.168.30.109', '192.168.20.109'])
  })

  it('expands host tail with route table prefixes', () => {
    const candidates = buildPairingHostCandidates('12', {
      localLanIps: ['192.168.2.16'],
      seedHosts: [],
      routeSubnetPrefixes: ['192.168.1', '192.168.2']
    })
    expect(candidates).toEqual(['192.168.2.12', '192.168.1.12'])
  })

  it('keeps full IPv4 as single candidate', () => {
    expect(
      buildPairingHostCandidates('192.168.20.109', {
        localLanIps: ['192.168.30.170'],
        seedHosts: []
      })
    ).toEqual(['192.168.20.109'])
  })

  it('detects tail segment', () => {
    expect(isHostTailSegment('109')).toBe(true)
    expect(isHostTailSegment('847293')).toBe(false)
  })

  it('extracts host tail from IPv4', () => {
    expect(hostTail('192.168.20.109')).toBe('109')
  })

  it('lists subnet broadcast addresses', () => {
    expect(listSubnetBroadcastAddresses(['192.168.30.170', '192.168.20.5'])).toEqual([
      '192.168.30.255',
      '192.168.20.255'
    ])
  })
})
