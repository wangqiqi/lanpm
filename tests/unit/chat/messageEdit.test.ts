import { describe, expect, it } from 'vitest'
import { canEditMessage, MESSAGE_EDIT_WINDOW_MS } from '@shared/chat/messageEdit'
import type { ChatMessage } from '@shared/chat/types'

const textMsg = (createdAt: string): ChatMessage => ({
  msgId: 'm1',
  groupId: 'g1',
  senderUserId: 'me',
  senderDeviceId: 'd1',
  type: 'text',
  content: { kind: 'text', text: 'hi' },
  lamportTs: 1,
  createdAt,
  deliveryStatus: 'sent'
})

describe('messageEdit', () => {
  it('allows own text within window', () => {
    const now = Date.parse('2026-01-01T01:00:00.000Z')
    const msg = textMsg('2026-01-01T00:50:00.000Z')
    expect(canEditMessage(msg, 'me', now)).toBe(true)
  })

  it('denies after window', () => {
    const now = Date.parse('2026-01-01T01:00:00.000Z')
    const msg = textMsg(new Date(now - MESSAGE_EDIT_WINDOW_MS - 1000).toISOString())
    expect(canEditMessage(msg, 'me', now)).toBe(false)
  })

  it('denies other user', () => {
    const msg = textMsg('2026-01-01T00:59:00.000Z')
    expect(canEditMessage(msg, 'other', Date.parse('2026-01-01T01:00:00.000Z'))).toBe(false)
  })
})
