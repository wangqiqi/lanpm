import { describe, expect, it } from 'vitest'
import { canForwardMessage, forwardedFromForMessage } from '@shared/chat/forwardMessage'
import type { ChatMessage } from '@shared/chat/types'

const base = (content: ChatMessage['content']): ChatMessage => ({
  msgId: 'm1',
  groupId: 'g1',
  senderUserId: 'u1',
  senderDeviceId: 'd1',
  type: 'text',
  content,
  lamportTs: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  deliveryStatus: 'sent'
})

describe('forwardMessage', () => {
  it('canForwardMessage allows text/code/file/task_ref', () => {
    expect(canForwardMessage(base({ kind: 'text', text: 'a' }))).toBe(true)
    expect(canForwardMessage(base({ kind: 'code', language: 'js', code: 'x' }))).toBe(true)
    expect(canForwardMessage(base({ kind: 'recalled', recalledBy: 'u', recalledAt: 't' }))).toBe(false)
  })

  it('forwardedFromForMessage captures source metadata', () => {
    const msg = base({ kind: 'text', text: 'hi' })
    expect(forwardedFromForMessage(msg, 'Bob')).toEqual({
      groupId: 'g1',
      senderUserId: 'u1',
      senderDisplayName: 'Bob',
      msgId: 'm1'
    })
  })
})
