import { describe, expect, it } from 'vitest'
import {
  listSubnetScanHosts,
  SUBNET_SCAN_MAX_HOSTS
} from '../../../src/shared/network/subnetScanHosts'

describe('listSubnetScanHosts', () => {
  it('generates .1–.254 for each prefix', () => {
    const hosts = listSubnetScanHosts(['10.0.0'], { maxHosts: 10 })
    expect(hosts).toEqual([
      '10.0.0.1',
      '10.0.0.2',
      '10.0.0.3',
      '10.0.0.4',
      '10.0.0.5',
      '10.0.0.6',
      '10.0.0.7',
      '10.0.0.8',
      '10.0.0.9',
      '10.0.0.10'
    ])
  })

  it('excludes local IPs and dedupes across prefixes', () => {
    const hosts = listSubnetScanHosts(['192.168.1', '192.168.1'], {
      excludeHosts: ['192.168.1.5'],
      maxHosts: 5
    })
    expect(hosts).toEqual(['192.168.1.1', '192.168.1.2', '192.168.1.3', '192.168.1.4', '192.168.1.6'])
  })

  it('respects global max host cap', () => {
    const hosts = listSubnetScanHosts(
      ['10.0.0', '10.0.1', '10.0.2', '10.0.3'],
      { maxHosts: SUBNET_SCAN_MAX_HOSTS }
    )
    expect(hosts.length).toBe(SUBNET_SCAN_MAX_HOSTS)
  })
})
