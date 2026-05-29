import type { ChatMessage } from './types'
import { extractMessageText } from '../search/extractMessageText'

const PREVIEW_MAX = 80

/** Plain-text preview for DM session rows and notifications. */
export function messagePreviewText(message: ChatMessage): string {
  const raw = extractMessageText(message.content)
  if (raw.trim()) return truncatePreview(raw)
  if (message.content.kind === 'code') return `[${message.content.language}]`
  if (message.content.kind === 'file') return message.content.fileName
  if (message.content.kind === 'task_ref') return message.content.title
  return ''
}

export function truncatePreview(text: string, max = PREVIEW_MAX): string {
  const trimmed = text.replace(/\s+/g, ' ').trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1)}…`
}

/** Last message in thread order (lamportTs / createdAt). */
export function lastChatMessage(messages: ChatMessage[]): ChatMessage | undefined {
  if (messages.length === 0) return undefined
  return messages.reduce((a, b) =>
    b.lamportTs > a.lamportTs || (b.lamportTs === a.lamportTs && b.createdAt > a.createdAt) ? b : a
  )
}
