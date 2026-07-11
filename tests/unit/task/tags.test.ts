import { describe, expect, it } from 'vitest'
import {
  collectUniqueTaskTags,
  filterTagsToGroupDict,
  filterTasksByTags,
  isValidTaskTag,
  normalizeTaskTags,
  resolveTagColor,
  tagColorHash,
  taskTagKey,
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

describe('filterTasksByTags (OR)', () => {
  const tasks = [
    { id: '1', tags: ['API', 'urgent'] },
    { id: '2', tags: ['docs'] },
    { id: '3', tags: [] },
    { id: '4', tags: undefined }
  ]

  it('returns all when selection empty', () => {
    expect(filterTasksByTags(tasks, [])).toEqual(tasks)
    expect(filterTasksByTags(tasks, ['  '])).toEqual(tasks)
  })

  it('keeps tasks matching any selected tag (case-insensitive)', () => {
    expect(filterTasksByTags(tasks, ['api']).map((t) => t.id)).toEqual(['1'])
    expect(filterTasksByTags(tasks, ['DOCS', 'urgent']).map((t) => t.id)).toEqual([
      '1',
      '2'
    ])
  })
})

describe('collectUniqueTaskTags', () => {
  it('dedupes and sorts by key, keeping first casing', () => {
    expect(
      collectUniqueTaskTags([{ tags: ['Zebra', 'api'] }, { tags: ['API', 'beta'] }])
    ).toEqual(['api', 'beta', 'Zebra'])
  })
})

describe('tagColorHash / resolveTagColor', () => {
  it('is stable and case-insensitive', () => {
    expect(tagColorHash('API')).toBe(tagColorHash('api'))
    expect(tagColorHash('API')).toMatch(/^hsl\(\d+ 42% 42%\)$/)
  })

  it('prefers hex override by key', () => {
    expect(resolveTagColor('API', { api: '#ff0000' })).toBe('#ff0000')
    expect(resolveTagColor('other', { api: '#ff0000' })).toBe(tagColorHash('other'))
  })

  it('exposes taskTagKey', () => {
    expect(taskTagKey('  Foo ')).toBe('foo')
  })
})

describe('filterTagsToGroupDict (TASK-210)', () => {
  it('returns empty when dict is empty', () => {
    expect(filterTagsToGroupDict(['a', 'b'], [])).toEqual([])
  })

  it('keeps only dict keys and uses dict label casing', () => {
    expect(
      filterTagsToGroupDict(['api', 'orphan', 'UI'], [
        { tagKey: 'api', label: 'API' },
        { tagKey: 'ui', label: 'UI' }
      ])
    ).toEqual(['API', 'UI'])
  })

  it('drops all when none match', () => {
    expect(filterTagsToGroupDict(['x'], [{ tagKey: 'api', label: 'API' }])).toEqual([])
  })
})
