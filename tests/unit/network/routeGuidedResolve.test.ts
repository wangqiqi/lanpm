import { describe, expect, it } from 'vitest'
import { listRouteGuidedBroadcastAddresses } from '../../../src/shared/network/routeGuidedResolve'

describe('routeGuidedResolve', () => {
  it('merges route prefixes into subnet broadcast addresses', () => {
    const addresses = listRouteGuidedBroadcastAddresses({
      routeSubnetPrefixes: ['192.168.20', '192.168.30'],
      localLanIps: ['192.168.30.170'],
      seedHosts: []
    })
    expect(addresses.sort()).toEqual(['192.168.20.255', '192.168.30.255'].sort())
  })

  it('falls back to local interface subnets when route list empty', () => {
    expect(
      listRouteGuidedBroadcastAddresses({
        routeSubnetPrefixes: [],
        localLanIps: ['192.168.30.170'],
        seedHosts: []
      })
    ).toEqual(['192.168.30.255'])
  })

  it('includes seed host subnets', () => {
    expect(
      listRouteGuidedBroadcastAddresses({
        routeSubnetPrefixes: [],
        localLanIps: [],
        seedHosts: ['192.168.20.50:43124']
      })
    ).toEqual(['192.168.20.255'])
  })
})
