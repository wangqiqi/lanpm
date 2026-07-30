import { describe, expect, it } from 'vitest'
import { formatPairingShareClipboard } from '../../../src/shared/discover/pairingShareClipboard'

const fmt = {
  lineCode: (code: string) => `code:${code}`,
  lineIp: (ip: string) => `ip:${ip}`,
  lineIpTail: (tail: string, ip: string) => `tail:${tail}@${ip}`,
  lineGroups: (names: string) => `groups:${names}`
}

describe('formatPairingShareClipboard', () => {
  it('includes code only when no ip or groups', () => {
    expect(
      formatPairingShareClipboard({ code: '847293', groupNames: [] }, fmt)
    ).toBe('code:847293')
  })

  it('strips non-digits from code', () => {
    expect(
      formatPairingShareClipboard({ code: '847 293', groupNames: [] }, fmt)
    ).toBe('code:847293')
  })

  it('includes ip tail line when both present', () => {
    const text = formatPairingShareClipboard(
      { code: '123456', localIp: '192.168.1.109', localIpTail: '109', groupNames: [] },
      fmt
    )
    expect(text).toBe('code:123456\ntail:109@192.168.1.109')
  })

  it('includes group names', () => {
    const text = formatPairingShareClipboard(
      { code: '123456', groupNames: ['Alpha', 'Beta'] },
      fmt
    )
    expect(text).toBe('code:123456\ngroups:Alpha, Beta')
  })
})
