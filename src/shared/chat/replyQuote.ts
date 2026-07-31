import type { ChatMessage } from './types'
import { extractMessageText } from '../search/extractMessageText'

export type ReplyQuoteState = 'ok' | 'recalled' | 'missing'

export interface ResolvedReplyQuote {
  state: ReplyQuoteState
  msgId: string
  senderUserId?: string
  senderName?: string
  preview: string
}

const RECALLED_PREVIEW = ''
const MISSING_PREVIEW = ''

/** One-line preview for composer quote bar. */
export function quotePreviewFromMessage(message: ChatMessage): string {
  if (message.content.kind === 'recalled') return ''
  const text = extractMessageText(message.content).replace(/\s+/g, ' ').trim()
  if (!text) return message.type
  return text.length > 120 ? `${text.slice(0, 117)}…` : text
}

export function resolveReplyQuote(
  replyToMsgId: string | undefined,
  lookup: (msgId: string) => ChatMessage | undefined,
  resolveSenderName?: (userId: string) => string | undefined
): ResolvedReplyQuote | null {
  if (!replyToMsgId) return null
  const original = lookup(replyToMsgId)
  if (!original) {
    return {
      state: 'missing',
      msgId: replyToMsgId,
      preview: MISSING_PREVIEW
    }
  }
  if (original.content.kind === 'recalled') {
    return {
      state: 'recalled',
      msgId: replyToMsgId,
      senderUserId: original.senderUserId,
      senderName: resolveSenderName?.(original.senderUserId),
      preview: RECALLED_PREVIEW
    }
  }
  return {
    state: 'ok',
    msgId: replyToMsgId,
    senderUserId: original.senderUserId,
    senderName: resolveSenderName?.(original.senderUserId),
    preview: quotePreviewFromMessage(original)
  }
}
