import { describe, expect, it } from 'vitest'
import type { ChatMessage } from '@shared/chat/types'
import {
  applyRecallPayload,
  canRecallMessage,
  toRecalledMessage
} from '@shared/chat/recall'

const base: ChatMessage = {
  msgId: 'msg_1',
  groupId: 'g1',
  senderUserId: 'user_a',
  senderDeviceId: 'dev_a',
  type: 'text',
  content: { kind: 'text', text: 'hello' },
  lamportTs: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  deliveryStatus: 'sent'
}

describe('chat recall', () => {
  it('allows sender to recall own message', () => {
    expect(canRecallMessage(base, 'user_a')).toBe(true)
    expect(canRecallMessage(base, 'user_b')).toBe(false)
  })

  it('blocks recall for system/recalled messages', () => {
    const recalled = toRecalledMessage(base, 'user_a', '2026-01-01T01:00:00.000Z')
    expect(canRecallMessage(recalled, 'user_a')).toBe(false)
  })

  it('toRecalledMessage preserves msgId and replaces content', () => {
    const recalled = toRecalledMessage(base, 'user_a', '2026-01-01T01:00:00.000Z')
    expect(recalled.msgId).toBe('msg_1')
    expect(recalled.type).toBe('system')
    expect(recalled.content).toEqual({
      kind: 'recalled',
      recalledBy: 'user_a',
      recalledAt: '2026-01-01T01:00:00.000Z'
    })
  })

  it('applyRecallPayload uses payload actor', () => {
    const recalled = applyRecallPayload(base, {
      groupId: 'g1',
      msgId: 'msg_1',
      recalledBy: 'user_a',
      recalledAt: '2026-01-02T00:00:00.000Z'
    })
    expect(recalled.content.kind).toBe('recalled')
    if (recalled.content.kind === 'recalled') {
      expect(recalled.content.recalledAt).toBe('2026-01-02T00:00:00.000Z')
    }
  })
})
