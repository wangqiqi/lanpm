import { describe, expect, it } from 'vitest'
import {
  isValidTaskTag,
  normalizeTaskTags,
  TASK_TAG_MAX_LENGTH,
  TASK_TAGS_MAX_COUNT
} from '@shared/task/tags'

describe('normalizeTaskTags', () => {
  it('returns empty for non-arrays', () => {
    expect(normalizeTaskTags(undefined)).toEqual([])
    expect(normalizeTaskTags(null)).toEqual([])
    expect(normalizeTaskTags('a')).toEqual([])
    expect(normalizeTaskTags(1)).toEqual([])
  })

  it('trims, drops empties, and preserves order', () => {
    expect(normalizeTaskTags(['  alpha ', '', '  ', 'beta'])).toEqual(['alpha', 'beta'])
  })

  it('dedupes case-insensitively keeping first casing', () => {
    expect(normalizeTaskTags(['API', 'api', 'Api', 'other'])).toEqual(['API', 'other'])
  })

  it('skips non-strings and overlong tags', () => {
    const long = 'x'.repeat(TASK_TAG_MAX_LENGTH + 1)
    expect(normalizeTaskTags(['ok', 1, null, long, 'yes'])).toEqual(['ok', 'yes'])
  })

  it('caps at TASK_TAGS_MAX_COUNT', () => {
    const many = Array.from({ length: TASK_TAGS_MAX_COUNT + 5 }, (_, i) => `t${i}`)
    const out = normalizeTaskTags(many)
    expect(out).toHaveLength(TASK_TAGS_MAX_COUNT)
    expect(out[0]).toBe('t0')
    expect(out[TASK_TAGS_MAX_COUNT - 1]).toBe(`t${TASK_TAGS_MAX_COUNT - 1}`)
  })
})

describe('isValidTaskTag', () => {
  it('accepts trimmed non-empty within max length', () => {
    expect(isValidTaskTag('  label ')).toBe(true)
    expect(isValidTaskTag('a'.repeat(TASK_TAG_MAX_LENGTH))).toBe(true)
  })

  it('rejects empty, non-string, or overlong', () => {
    expect(isValidTaskTag('')).toBe(false)
    expect(isValidTaskTag('   ')).toBe(false)
    expect(isValidTaskTag(1)).toBe(false)
    expect(isValidTaskTag('a'.repeat(TASK_TAG_MAX_LENGTH + 1))).toBe(false)
  })
})
