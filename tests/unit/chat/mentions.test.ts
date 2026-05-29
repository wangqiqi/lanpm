import { describe, expect, it } from 'vitest'
import { parseMentions, splitMentionSegments } from '@shared/chat/mentions'

const members = [
  { userId: 'user_b', displayName: 'Bob', mentionKeys: ['bob'] },
  { userId: 'user_a', displayName: 'Alice', mentionKeys: ['alice'] }
]

describe('parseMentions', () => {
  it('resolves display name to userId', () => {
    expect(parseMentions('hi @Bob please review', members)).toEqual(['user_b'])
  })

  it('returns empty when no mention', () => {
    expect(parseMentions('hello world', members)).toEqual([])
  })
})

describe('splitMentionSegments', () => {
  it('marks mention segment with userId', () => {
    const segments = splitMentionSegments('hello @Alice', members)
    const mention = segments.find((s) => s.kind === 'mention')
    expect(mention?.userId).toBe('user_a')
  })
})
