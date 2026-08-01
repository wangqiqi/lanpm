import { describe, expect, it } from 'vitest'
import {
  buildForwardedTextContent,
  canForwardMessage,
  cloneContentForForward,
  forwardedFromForMessage
} from '@shared/chat/forwardMessage'
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

  it('canForwardMessage allows voice messages', () => {
    expect(
      canForwardMessage(
        base({
          kind: 'voice',
          fileId: 'f1',
          durationMs: 3000,
          mimeType: 'audio/webm'
        })
      )
    ).toBe(true)
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

  it('cloneContentForForward copies voice payload', () => {
    const voice = {
      kind: 'voice' as const,
      fileId: 'f1',
      durationMs: 4500,
      mimeType: 'audio/webm'
    }
    expect(cloneContentForForward(voice)).toEqual(voice)
  })

  it('buildForwardedTextContent prefixes voice preview', () => {
    const msg: ChatMessage = {
      ...base({
        kind: 'voice',
        fileId: 'f1',
        durationMs: 8000,
        mimeType: 'audio/webm'
      }),
      type: 'voice'
    }
    const from = forwardedFromForMessage(msg, 'Alice')
    expect(buildForwardedTextContent(msg, from).text).toBe('[转发] Alice: [voice 8s]')
  })
})
