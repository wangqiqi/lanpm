import { describe, expect, it } from 'vitest'
import type { ChatMessage } from '@shared/chat/types'
import { collectTaskDiscussions } from '@shared/task/discussions'
import { normalizeLinkedFileIds, TASK_LINKED_FILES_MAX } from '@shared/task/linkedFiles'

function msg(
  partial: Partial<ChatMessage> & Pick<ChatMessage, 'msgId' | 'content' | 'lamportTs'>
): ChatMessage {
  return {
    groupId: 'g1',
    senderUserId: 'u1',
    senderDeviceId: 'd1',
    type: partial.content.kind === 'task_ref' ? 'task_ref' : 'text',
    createdAt: `2026-07-11T00:00:0${partial.lamportTs}Z`,
    deliveryStatus: 'sent',
    ...partial
  }
}

describe('normalizeLinkedFileIds', () => {
  it('returns empty for non-arrays', () => {
    expect(normalizeLinkedFileIds(undefined)).toEqual([])
    expect(normalizeLinkedFileIds(null)).toEqual([])
    expect(normalizeLinkedFileIds('x')).toEqual([])
  })

  it('trims, dedupes, skips non-strings, caps max', () => {
    expect(normalizeLinkedFileIds(['  a ', '', 'a', 1, 'b'])).toEqual(['a', 'b'])
    const many = Array.from({ length: TASK_LINKED_FILES_MAX + 3 }, (_, i) => `f${i}`)
    expect(normalizeLinkedFileIds(many)).toHaveLength(TASK_LINKED_FILES_MAX)
  })
})

describe('collectTaskDiscussions', () => {
  it('includes task_ref and source; source wins on same id; sorts by lamport', () => {
    const messages = [
      msg({
        msgId: 'm2',
        lamportTs: 2,
        content: { kind: 'task_ref', taskId: 't1', title: 'T' }
      }),
      msg({
        msgId: 'm1',
        lamportTs: 1,
        content: { kind: 'text', text: 'origin' }
      }),
      msg({
        msgId: 'm3',
        lamportTs: 3,
        content: { kind: 'task_ref', taskId: 'other', title: 'X' }
      }),
      msg({
        msgId: 'm4',
        lamportTs: 4,
        content: { kind: 'recalled', recalledBy: 'u1', recalledAt: '2026-07-11T00:00:04Z' }
      })
    ]
    const out = collectTaskDiscussions(messages, 't1', 'm1')
    expect(out.map((d) => [d.kind, d.message.msgId])).toEqual([
      ['source', 'm1'],
      ['task_ref', 'm2']
    ])
  })

  it('marks overlapping source+task_ref as source', () => {
    const messages = [
      msg({
        msgId: 'm1',
        lamportTs: 1,
        content: { kind: 'task_ref', taskId: 't1', title: 'T' }
      })
    ]
    const out = collectTaskDiscussions(messages, 't1', 'm1')
    expect(out).toHaveLength(1)
    expect(out[0]!.kind).toBe('source')
  })
})
