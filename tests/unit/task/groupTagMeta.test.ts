import { describe, expect, it } from 'vitest'
import {
  groupTagMetaToColorMap,
  isGroupTagColor,
  isGroupTagMeta,
  isGroupTagPatchPayload,
  normalizeGroupTagKey
} from '../../../src/shared/task/groupTagMeta'

describe('groupTagMeta protocol', () => {
  const meta = {
    groupId: 'g1',
    tagKey: 'api',
    color: '#aabbcc',
    updatedAt: '2026-07-11T00:00:00.000Z',
    label: 'API'
  }

  it('normalizes tag keys', () => {
    expect(normalizeGroupTagKey('  API ')).toBe('api')
  })

  it('validates colors', () => {
    expect(isGroupTagColor('#Ff00Aa')).toBe(true)
    expect(isGroupTagColor('#fff')).toBe(false)
    expect(isGroupTagColor('red')).toBe(false)
  })

  it('accepts GroupTagMeta', () => {
    expect(isGroupTagMeta(meta)).toBe(true)
    expect(isGroupTagMeta({ ...meta, tagKey: 'API' })).toBe(false)
  })

  it('validates upsert/delete patches', () => {
    expect(
      isGroupTagPatchPayload({
        action: 'upsert',
        groupId: 'g1',
        tagKey: 'api',
        color: '#112233',
        updatedAt: '2026-07-11T01:00:00.000Z'
      })
    ).toBe(true)
    expect(
      isGroupTagPatchPayload({
        action: 'delete',
        groupId: 'g1',
        tagKey: 'api',
        updatedAt: '2026-07-11T01:00:00.000Z'
      })
    ).toBe(true)
    expect(
      isGroupTagPatchPayload({
        action: 'upsert',
        groupId: 'g1',
        tagKey: 'api',
        updatedAt: '2026-07-11T01:00:00.000Z'
      })
    ).toBe(false)
  })

  it('builds color map', () => {
    expect(groupTagMetaToColorMap([meta])).toEqual({ api: '#aabbcc' })
  })
})
