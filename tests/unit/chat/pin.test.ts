import { describe, expect, it } from 'vitest'
import { isMessagePinned, mergePinPayload, togglePinId, MAX_PINNED_MESSAGES_PER_GROUP } from '@shared/chat/pin'

describe('pin', () => {
  it('togglePinId adds and removes', () => {
    expect(togglePinId([], 'a')).toEqual(['a'])
    expect(togglePinId(['a', 'b'], 'a')).toEqual(['b'])
  })

  it('caps pin list length', () => {
    const ids = Array.from({ length: MAX_PINNED_MESSAGES_PER_GROUP }, (_, i) => `m${i}`)
    const next = togglePinId(ids, 'new')
    expect(next).toHaveLength(MAX_PINNED_MESSAGES_PER_GROUP)
    expect(next.at(-1)).toBe('new')
  })

  it('mergePinPayload uses LWW by updatedAt', () => {
    const older = { groupId: 'g', msgIds: ['a'], updatedAt: '1', updatedBy: 'u' }
    const newer = { groupId: 'g', msgIds: ['b'], updatedAt: '2', updatedBy: 'u' }
    expect(mergePinPayload(older, newer).msgIds).toEqual(['b'])
    expect(mergePinPayload(newer, older).msgIds).toEqual(['b'])
  })

  it('isMessagePinned', () => {
    expect(isMessagePinned(['x'], 'x')).toBe(true)
    expect(isMessagePinned(['x'], 'y')).toBe(false)
  })
})
