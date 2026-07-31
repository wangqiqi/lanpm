import type { ChatMessage } from './types'

/** Editable window after send (ms). */
export const MESSAGE_EDIT_WINDOW_MS = 15 * 60 * 1000

export function canEditMessage(message: ChatMessage, currentUserId: string, nowMs = Date.now()): boolean {
  if (message.senderUserId !== currentUserId) return false
  if (message.content.kind !== 'text') return false
  if (message.deliveryStatus === 'failed' || message.deliveryStatus === 'sending') return false
  const created = Date.parse(message.createdAt)
  if (!Number.isFinite(created)) return false
  return nowMs - created <= MESSAGE_EDIT_WINDOW_MS
}
