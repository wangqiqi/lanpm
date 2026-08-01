import { describe, expect, it } from 'vitest'
import type { ChatMessage } from '../../../src/shared/chat/types.ts'
import {
  CHAT_MEMORY_WINDOW,
  compareChatMessages,
  mergeChatMessage,
  mergeOlderChatMessages,
  trimChatMemoryWindow
} from '../../../src/shared/chat/messageListMerge.ts'

function msg(id: string, lamport: number, createdAt = '2026-01-01T00:00:00.000Z'): ChatMessage {
  return {
    msgId: id,
    groupId: 'g1',
    senderUserId: 'u1',
    lamportTs: lamport,
    createdAt,
    content: { kind: 'text', text: id }
  }
}

describe('messageListMerge', () => {
  it('compareChatMessages orders by lamport then createdAt', () => {
    expect(compareChatMessages(msg('a', 1), msg('b', 2))).toBeLessThan(0)
  })

  it('mergeChatMessage appends in order without full resort', () => {
    const list = [msg('a', 1), msg('b', 2)]
    const next = mergeChatMessage(list, msg('c', 3))
    expect(next.map((m) => m.msgId)).toEqual(['a', 'b', 'c'])
    expect(next).not.toBe(list)
  })

  it('mergeChatMessage patches in place when sort keys unchanged', () => {
    const list = [msg('a', 1), msg('b', 2)]
    const patched = { ...msg('b', 2), content: { kind: 'text' as const, text: 'edited' } }
    const next = mergeChatMessage(list, patched)
    expect(next.map((m) => m.msgId)).toEqual(['a', 'b'])
    expect(next[1]?.content).toEqual({ kind: 'text', text: 'edited' })
  })

  it('trimChatMemoryWindow keeps tail', () => {
    const long = Array.from({ length: CHAT_MEMORY_WINDOW + 5 }, (_, i) => msg(`m${i}`, i))
    const trimmed = trimChatMemoryWindow(long)
    expect(trimmed).toHaveLength(CHAT_MEMORY_WINDOW)
    expect(trimmed[0]?.msgId).toBe('m5')
    expect(trimmed.at(-1)?.msgId).toBe(`m${CHAT_MEMORY_WINDOW + 4}`)
  })

  it('mergeOlderChatMessages dedupes and sorts', () => {
    const existing = [msg('b', 2), msg('c', 3)]
    const older = [msg('a', 1), msg('b', 2)]
    const next = mergeOlderChatMessages(existing, older)
    expect(next.map((m) => m.msgId)).toEqual(['a', 'b', 'c'])
  })
})
