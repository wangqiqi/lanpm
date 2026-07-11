import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LANPM_TCP_PORT,
  resolveLanpmTcpPort
} from '@shared/network/listenPort'

describe('resolveLanpmTcpPort', () => {
  it('uses default when unset or blank', () => {
    expect(resolveLanpmTcpPort(undefined)).toBe(DEFAULT_LANPM_TCP_PORT)
    expect(resolveLanpmTcpPort(null)).toBe(DEFAULT_LANPM_TCP_PORT)
    expect(resolveLanpmTcpPort('')).toBe(DEFAULT_LANPM_TCP_PORT)
    expect(resolveLanpmTcpPort('  ')).toBe(DEFAULT_LANPM_TCP_PORT)
  })

  it('accepts valid integers in 1..65535', () => {
    expect(resolveLanpmTcpPort('1')).toBe(1)
    expect(resolveLanpmTcpPort('43124')).toBe(43124)
    expect(resolveLanpmTcpPort('65535')).toBe(65535)
  })

  it('falls back on out-of-range or non-integer', () => {
    expect(resolveLanpmTcpPort('0')).toBe(DEFAULT_LANPM_TCP_PORT)
    expect(resolveLanpmTcpPort('99999')).toBe(DEFAULT_LANPM_TCP_PORT)
    expect(resolveLanpmTcpPort('3.5')).toBe(DEFAULT_LANPM_TCP_PORT)
    expect(resolveLanpmTcpPort('abc')).toBe(DEFAULT_LANPM_TCP_PORT)
  })
})
