import { describe, expect, it } from 'vitest'
import { hasEstablishedTcpTo } from '../../../src/shared/network/ssEstablished'

describe('hasEstablishedTcpTo', () => {
  it('matches linux ss ESTAB to peer:43124', () => {
    const ss = `State Recv-Q Send-Q Local Address:Port Peer Address:Port
ESTAB 0 0 192.168.20.16:46912 192.168.20.12:43124`
    expect(hasEstablishedTcpTo(ss, '192.168.20.12', 43124)).toBe(true)
    expect(hasEstablishedTcpTo(ss, '192.168.20.12', 43123)).toBe(false)
  })

  it('matches windows-style ESTABLISHED (foreign :43124)', () => {
    const netstat = 'ESTABLISHED 0 0 192.168.20.12:51234 192.168.20.16:43124'
    expect(hasEstablishedTcpTo(netstat, '192.168.20.16', 43124)).toBe(true)
  })

  it('matches windows netstat -ano (local :43124, peer ephemeral)', () => {
    const netstat =
      '  TCP    192.168.20.12:43124    192.168.20.16:56528    ESTABLISHED     58044'
    expect(hasEstablishedTcpTo(netstat, '192.168.20.16', 43124)).toBe(true)
  })
})
