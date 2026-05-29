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

  it('resolves mentionKeys and userId tokens', () => {
    expect(parseMentions('@alice ping', members)).toEqual(['user_a'])
    expect(parseMentions('@user_b', members)).toEqual(['user_b'])
  })

  it('deduplicates multiple mentions of same user', () => {
    expect(parseMentions('@Bob and @bob again', members)).toEqual(['user_b'])
  })

  it('collects multiple distinct users', () => {
    expect(parseMentions('@Bob @Alice', members).sort()).toEqual(['user_a', 'user_b'])
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

  it('returns single text segment when no mentions', () => {
    expect(splitMentionSegments('plain text', members)).toEqual([
      { kind: 'text', value: 'plain text' }
    ])
  })

  it('keeps unknown mention without userId', () => {
    const segments = splitMentionSegments('hi @Unknown', members)
    const mention = segments.find((s) => s.kind === 'mention')
    expect(mention?.userId).toBeUndefined()
    expect(mention?.value).toBe('@Unknown')
  })
})
