import { describe, expect, it } from 'vitest'
import type { ChatMessage } from '@shared/chat/types'
import { quotePreviewFromMessage, resolveReplyQuote } from '@shared/chat/replyQuote'

const base = (overrides: Partial<ChatMessage> & { content: ChatMessage['content'] }): ChatMessage => ({
  msgId: 'msg_1',
  groupId: 'g1',
  senderUserId: 'user_a',
  senderDeviceId: 'dev_a',
  type: 'text',
  lamportTs: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  deliveryStatus: 'sent',
  ...overrides
})

describe('replyQuote', () => {
  it('returns null when no replyToMsgId', () => {
    expect(resolveReplyQuote(undefined, () => undefined)).toBeNull()
  })

  it('resolves ok preview from original message', () => {
    const original = base({ msgId: 'm0', content: { kind: 'text', text: 'hello world' } })
    const quote = resolveReplyQuote('m0', (id) => (id === 'm0' ? original : undefined), () => 'Alice')
    expect(quote).toMatchObject({
      state: 'ok',
      msgId: 'm0',
      senderName: 'Alice',
      preview: 'hello world'
    })
  })

  it('handles recalled original', () => {
    const original = base({
      msgId: 'm0',
      content: { kind: 'recalled', recalledBy: 'u', recalledAt: 't' }
    })
    const quote = resolveReplyQuote('m0', () => original)
    expect(quote?.state).toBe('recalled')
    expect(quote?.preview).toBe('')
  })

  it('handles missing original', () => {
    const quote = resolveReplyQuote('missing', () => undefined)
    expect(quote?.state).toBe('missing')
  })

  it('quotePreviewFromMessage truncates long text', () => {
    const long = 'a'.repeat(150)
    const preview = quotePreviewFromMessage(base({ content: { kind: 'text', text: long } }))
    expect(preview.length).toBeLessThanOrEqual(120)
    expect(preview.endsWith('…')).toBe(true)
  })

  it('uses kindLabels instead of raw message.type when preview empty', () => {
    const preview = quotePreviewFromMessage(
      base({ type: 'file', content: { kind: 'file', fileId: 'f1', fileName: '  ', size: 0 } }),
      { file: '[文件]' }
    )
    expect(preview).toBe('[文件]')
    expect(preview).not.toBe('file')
  })

  it('returns empty string when no text and no kindLabels', () => {
    const preview = quotePreviewFromMessage(
      base({ type: 'code', content: { kind: 'code', language: 'js', code: '' } })
    )
    expect(preview).toBe('')
  })
})
