import { describe, expect, it } from 'vitest'
import {
  isExcludedLanIp,
  isPhysicalLanInterfaceName,
  isPrivateIpv4,
  isVirtualInterfaceName,
  resolvePeerHost,
  scoreLanCandidate
} from '../../../src/main/network/localIp'

describe('localIp', () => {
  it('recognizes RFC1918 private addresses', () => {
    expect(isPrivateIpv4('192.168.30.159')).toBe(true)
    expect(isPrivateIpv4('10.0.0.5')).toBe(true)
    expect(isPrivateIpv4('172.16.0.1')).toBe(true)
    expect(isPrivateIpv4('198.18.0.1')).toBe(false)
    expect(isPrivateIpv4('169.254.1.1')).toBe(false)
  })

  it('excludes VPN fake-ip and link-local', () => {
    expect(isExcludedLanIp('198.18.0.1')).toBe(true)
    expect(isExcludedLanIp('169.254.218.221')).toBe(true)
    expect(isExcludedLanIp('192.168.30.159')).toBe(false)
  })

  it('flags virtual adapters', () => {
    expect(isVirtualInterfaceName('VMware Network Adapter VMnet1')).toBe(true)
    expect(isVirtualInterfaceName('Meta')).toBe(true)
    expect(isVirtualInterfaceName('WLAN')).toBe(false)
    expect(isPhysicalLanInterfaceName('WLAN')).toBe(true)
    expect(isPhysicalLanInterfaceName('以太网')).toBe(true)
  })

  it('prefers WLAN over VMware on typical Windows setup', () => {
    const wlan = scoreLanCandidate('WLAN', '192.168.30.159')
    const vmware = scoreLanCandidate('VMware Network Adapter VMnet1', '192.168.227.1')
    expect(wlan).toBeGreaterThan(vmware)
    expect(vmware).toBeLessThan(0)
  })

  it('resolvePeerHost prefers advertised LAN IP over VPN source', () => {
    expect(resolvePeerHost('192.168.30.159', '198.18.0.1')).toBe('192.168.30.159')
    expect(resolvePeerHost(undefined, '192.168.30.159')).toBe('192.168.30.159')
    expect(resolvePeerHost('198.18.0.1', '192.168.30.159')).toBe('192.168.30.159')
  })
})
