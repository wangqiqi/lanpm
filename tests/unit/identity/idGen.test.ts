import { describe, expect, it } from 'vitest'
import {
  allocateUserId,
  formatSuffix,
  isValidUserId,
  newDeviceId,
  toUserIdSlug,
  validateManualUserId
} from '@shared/identity/idGen'

describe('formatSuffix', () => {
  it('formats yymm suffix', () => {
    expect(formatSuffix(new Date('2024-01-15T00:00:00Z'))).toBe('-2401')
  })
})

describe('toUserIdSlug', () => {
  it('slugifies ascii names', () => {
    expect(toUserIdSlug('Alice Bob')).toBe('alice-bob')
  })

  it('strips diacritics', () => {
    expect(toUserIdSlug('José')).toBe('jose')
  })

  it('generates random slug for short non-ascii names', () => {
    expect(toUserIdSlug('张')).toMatch(/^u[a-f0-9]{8}$/)
  })
})

describe('newDeviceId', () => {
  it('uses dev_ prefix and hex suffix', () => {
    expect(newDeviceId()).toMatch(/^dev_[a-f0-9]{12}$/)
  })
})

describe('allocateUserId', () => {
  const fixedDate = new Date('2024-01-15T00:00:00Z')

  it('returns base slug when unique', () => {
    expect(allocateUserId('Alice', () => false, fixedDate)).toEqual({
      userId: 'alice',
      displayName: 'Alice'
    })
  })

  it('appends suffix on local conflict', () => {
    const taken = new Set(['bob'])
    expect(allocateUserId('Bob', (id) => taken.has(id), fixedDate)).toEqual({
      userId: 'bob-2401',
      suffix: '-2401',
      displayName: 'Bob-2401'
    })
  })

  it('increments numeric suffix when base and yymm are taken', () => {
    const taken = new Set(['bob', 'bob-2401'])
    expect(allocateUserId('Bob', (id) => taken.has(id), fixedDate)).toEqual({
      userId: 'bob-2401-2',
      suffix: '-2401-2',
      displayName: 'Bob-2401-2'
    })
  })

  it('falls back to random suffix after many collisions', () => {
    const taken = new Set(['bob', 'bob-2401'])
    for (let n = 2; n < 100; n++) taken.add(`bob-2401-${n}`)
    const result = allocateUserId('Bob', (id) => taken.has(id), fixedDate)
    expect(result.userId).toMatch(/^bob-[a-f0-9]{6}$/)
    expect(result.displayName).toContain('Bob-')
  })
})

describe('validateManualUserId', () => {
  it('accepts valid unused ids', () => {
    expect(validateManualUserId('valid-id', () => false).ok).toBe(true)
  })

  it('rejects taken or invalid ids', () => {
    expect(validateManualUserId('valid-id', () => true).ok).toBe(false)
    expect(validateManualUserId('X', () => false).ok).toBe(false)
  })

  it('rejects empty or whitespace ids with reason', () => {
    expect(validateManualUserId('', () => false)).toEqual({
      ok: false,
      reason: '用户 ID 不能为空'
    })
    expect(validateManualUserId('  ', () => false).ok).toBe(false)
  })
})

describe('isValidUserId', () => {
  it('validates id pattern', () => {
    expect(isValidUserId('alice')).toBe(true)
    expect(isValidUserId('a')).toBe(false)
  })
})
