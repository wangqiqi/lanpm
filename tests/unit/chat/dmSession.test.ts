import { describe, expect, it } from 'vitest'
import {
  buildDmGroupId,
  getDmPeerUserId,
  isDmGroupId,
  parseDmGroupId
} from '@shared/chat/dmSession'

describe('buildDmGroupId', () => {
  it('sorts user ids lexicographically', () => {
    expect(buildDmGroupId('bob', 'alice')).toBe('dm:alice__bob')
    expect(buildDmGroupId('alice', 'bob')).toBe('dm:alice__bob')
  })

  it('rejects self-dm', () => {
    expect(() => buildDmGroupId('alice', 'alice')).toThrow('不能与自己私聊')
  })
})

describe('parseDmGroupId', () => {
  it('parses valid dm group id', () => {
    expect(parseDmGroupId('dm:alice__bob')).toEqual(['alice', 'bob'])
  })

  it('returns null for non-dm id', () => {
    expect(parseDmGroupId('demo-project')).toBeNull()
  })
})

describe('isDmGroupId', () => {
  it('detects dm prefix', () => {
    expect(isDmGroupId('dm:alice__bob')).toBe(true)
    expect(isDmGroupId('project-1')).toBe(false)
  })
})

describe('getDmPeerUserId', () => {
  it('returns the other participant', () => {
    expect(getDmPeerUserId('dm:alice__bob', 'alice')).toBe('bob')
    expect(getDmPeerUserId('dm:alice__bob', 'bob')).toBe('alice')
  })

  it('returns null when local user is not in the pair', () => {
    expect(getDmPeerUserId('dm:alice__bob', 'carol')).toBeNull()
  })
})
