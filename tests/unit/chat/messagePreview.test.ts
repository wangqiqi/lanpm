import { describe, expect, it } from 'vitest'
import type { ChatMessage } from '@shared/chat/types'
import { lastChatMessage, messagePreviewText, truncatePreview } from '@shared/chat/messagePreview'

describe('messagePreview', () => {
  it('truncatePreview shortens long text', () => {
    expect(truncatePreview('hello world', 8)).toBe('hello w…')
  })

  it('messagePreviewText extracts text', () => {
    const msg: ChatMessage = {
      msgId: '1',
      groupId: 'g',
      senderUserId: 'u',
      senderDeviceId: 'd',
      type: 'text',
      content: { kind: 'text', text: '  hello   there  ' },
      lamportTs: 1,
      createdAt: '2026-01-01T00:00:00.000Z',
      deliveryStatus: 'sent'
    }
    expect(messagePreviewText(msg)).toBe('hello there')
  })

  it('messagePreviewText formats voice duration', () => {
    const msg: ChatMessage = {
      msgId: 'v1',
      groupId: 'g',
      senderUserId: 'u',
      senderDeviceId: 'd',
      type: 'voice',
      content: {
        kind: 'voice',
        fileId: 'f1',
        durationMs: 12_500,
        mimeType: 'audio/webm'
      },
      lamportTs: 1,
      createdAt: '2026-01-01T00:00:00.000Z',
      deliveryStatus: 'sent'
    }
    expect(messagePreviewText(msg)).toBe('[voice 13s]')
  })

  it('lastChatMessage picks latest lamportTs', () => {
    const base = {
      groupId: 'g',
      senderUserId: 'u',
      senderDeviceId: 'd',
      type: 'text' as const,
      content: { kind: 'text' as const, text: 'x' },
      createdAt: '2026-01-01T00:00:00.000Z',
      deliveryStatus: 'sent' as const
    }
    const a: ChatMessage = { ...base, msgId: 'a', lamportTs: 1 }
    const b: ChatMessage = { ...base, msgId: 'b', lamportTs: 3 }
    const c: ChatMessage = { ...base, msgId: 'c', lamportTs: 2 }
    expect(lastChatMessage([a, c, b])?.msgId).toBe('b')
  })
})
