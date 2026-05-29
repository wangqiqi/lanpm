import { describe, expect, it } from 'vitest'
import {
  allocateUserId,
  formatSuffix,
  isValidUserId,
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
})

describe('validateManualUserId', () => {
  it('accepts valid unused ids', () => {
    expect(validateManualUserId('valid-id', () => false).ok).toBe(true)
  })

  it('rejects taken or invalid ids', () => {
    expect(validateManualUserId('valid-id', () => true).ok).toBe(false)
    expect(validateManualUserId('X', () => false).ok).toBe(false)
  })
})

describe('isValidUserId', () => {
  it('validates id pattern', () => {
    expect(isValidUserId('alice')).toBe(true)
    expect(isValidUserId('a')).toBe(false)
  })
})
