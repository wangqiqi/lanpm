import { describe, expect, it } from 'vitest'
import { dmPreviewFromMessage, shouldReplaceDmPreview } from '@shared/chat/dmPreview'
import type { ChatMessage } from '@shared/chat/types'

function msg(overrides: Partial<ChatMessage> & Pick<ChatMessage, 'groupId' | 'lamportTs'>): ChatMessage {
  return {
    msgId: overrides.msgId ?? 'm1',
    groupId: overrides.groupId,
    senderUserId: overrides.senderUserId ?? 'u1',
    senderDeviceId: overrides.senderDeviceId ?? 'd1',
    type: overrides.type ?? 'text',
    content: overrides.content ?? { kind: 'text', text: 'hi' },
    lamportTs: overrides.lamportTs,
    createdAt: overrides.createdAt ?? '2026-08-01T00:00:00.000Z',
    deliveryStatus: overrides.deliveryStatus ?? 'sent'
  }
}

describe('dmPreview', () => {
  it('dmPreviewFromMessage maps fields', () => {
    const message = msg({ groupId: 'dm:a:b', lamportTs: 3, createdAt: '2026-08-01T01:00:00.000Z' })
    const preview = dmPreviewFromMessage(message)
    expect(preview.groupId).toBe('dm:a:b')
    expect(preview.lastAt).toBe('2026-08-01T01:00:00.000Z')
    expect(preview.lastMessage).toBe(message)
  })

  it('shouldReplaceDmPreview prefers newer lamport', () => {
    const current = dmPreviewFromMessage(msg({ groupId: 'dm:a:b', lamportTs: 1 }))
    const incoming = msg({ groupId: 'dm:a:b', lamportTs: 2 })
    expect(shouldReplaceDmPreview(current, incoming)).toBe(true)
    expect(
      shouldReplaceDmPreview(
        current,
        msg({ groupId: 'dm:a:b', lamportTs: 0, createdAt: '2025-01-01T00:00:00.000Z' })
      )
    ).toBe(false)
  })
})
