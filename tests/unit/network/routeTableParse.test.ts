import { describe, expect, it } from 'vitest'
import {
  parseLinuxIpRoute,
  parseMacOsNetstatRn,
  parseWindowsRoutePrint
} from '../../../src/shared/network/routeTableParse'

const WIN_FIXTURE = `
===========================================================================
Interface List
===========================================================================
Active Routes:
Network Destination        Netmask          Gateway       Interface  Metric
          0.0.0.0          0.0.0.0      192.168.30.1    192.168.30.170     35
     192.168.20.0    255.255.255.0         On-link      192.168.20.5     25
     192.168.30.0    255.255.255.0         On-link     192.168.30.170     35
        127.0.0.0        255.0.0.0         On-link         127.0.0.1    331
`

const LINUX_FIXTURE = `
default via 192.168.30.1 dev wlan0 proto dhcp src 192.168.30.170
192.168.20.0/24 dev eth0 proto kernel scope link src 192.168.20.5
192.168.30.0/24 dev wlan0 proto kernel scope link src 192.168.30.170
`

const MAC_FIXTURE = `
Routing tables

Internet:
Destination        Gateway            Flags        Netif Expire
default            192.168.30.1       UGScg         en0
127                127.0.0.1          UCS           lo0
169.254            link#6             UCS           en0
192.168.20/24      link#6             UCS           en0
192.168.30         192.168.30.1       UGScg         en0
`

describe('routeTableParse', () => {
  it('parses Windows route print into /24 prefixes', () => {
    expect(parseWindowsRoutePrint(WIN_FIXTURE).sort()).toEqual(
      ['192.168.20', '192.168.30'].sort()
    )
  })

  it('parses Linux ip route into /24 prefixes', () => {
    expect(parseLinuxIpRoute(LINUX_FIXTURE).sort()).toEqual(
      ['192.168.20', '192.168.30'].sort()
    )
  })

  it('parses macOS netstat -rn into /24 prefixes', () => {
    expect(parseMacOsNetstatRn(MAC_FIXTURE).sort()).toEqual(
      ['192.168.20', '192.168.30'].sort()
    )
  })

  it('returns empty for blank output', () => {
    expect(parseWindowsRoutePrint('')).toEqual([])
    expect(parseLinuxIpRoute('')).toEqual([])
    expect(parseMacOsNetstatRn('')).toEqual([])
  })
})
