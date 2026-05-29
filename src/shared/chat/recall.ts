import type { ChatMessage, MessageContent } from './types'

export interface ChatRecallPayload {
  groupId: string
  msgId: string
  recalledBy: string
  recalledAt: string
}

export function isRecalledContent(content: MessageContent): boolean {
  return content.kind === 'recalled'
}

export function canRecallMessage(message: ChatMessage, userId: string): boolean {
  if (message.senderUserId !== userId) return false
  if (message.content.kind === 'recalled' || message.content.kind === 'system') return false
  return true
}

export function toRecalledMessage(
  message: ChatMessage,
  recalledBy: string,
  recalledAt: string
): ChatMessage {
  return {
    ...message,
    type: 'system',
    content: { kind: 'recalled', recalledBy, recalledAt }
  }
}

export function applyRecallPayload(
  message: ChatMessage,
  payload: ChatRecallPayload
): ChatMessage {
  return toRecalledMessage(message, payload.recalledBy, payload.recalledAt)
}
