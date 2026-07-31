import type { ChatMessage, MessageContent } from './types'
import { extractMessageText } from '../search/extractMessageText'

export type ReplyQuoteState = 'ok' | 'recalled' | 'missing'

export type QuoteKindLabel = MessageContent['kind']

/** Optional i18n labels for non-text / empty previews (never leak raw `message.type`). */
export type QuoteKindLabels = Partial<Record<QuoteKindLabel, string>>

export interface ResolvedReplyQuote {
  state: ReplyQuoteState
  msgId: string
  senderUserId?: string
  senderName?: string
  preview: string
  contentKind?: QuoteKindLabel
}

const RECALLED_PREVIEW = ''
const MISSING_PREVIEW = ''

/** One-line preview for composer quote bar / bubble strip / pinned bar. */
export function quotePreviewFromMessage(
  message: ChatMessage,
  kindLabels?: QuoteKindLabels
): string {
  if (message.content.kind === 'recalled') return ''
  const text = extractMessageText(message.content).replace(/\s+/g, ' ').trim()
  if (text) return text.length > 120 ? `${text.slice(0, 117)}…` : text
  return kindLabels?.[message.content.kind] ?? ''
}

export function resolveReplyQuote(
  replyToMsgId: string | undefined,
  lookup: (msgId: string) => ChatMessage | undefined,
  resolveSenderName?: (userId: string) => string | undefined,
  kindLabels?: QuoteKindLabels
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
      preview: RECALLED_PREVIEW,
      contentKind: 'recalled'
    }
  }
  return {
    state: 'ok',
    msgId: replyToMsgId,
    senderUserId: original.senderUserId,
    senderName: resolveSenderName?.(original.senderUserId),
    preview: quotePreviewFromMessage(original, kindLabels),
    contentKind: original.content.kind
  }
}
