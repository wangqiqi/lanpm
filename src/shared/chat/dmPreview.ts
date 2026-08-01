import type { ChatMessage } from './types'

/** Per-DM-group last message for session list preview (lightweight IPC payload). */
export interface DmMessagePreview {
  groupId: string
  /** ISO `createdAt` of last message; null when no messages */
  lastAt: string | null
  lastMessage: ChatMessage | null
}

export function dmPreviewFromMessage(message: ChatMessage): DmMessagePreview {
  return {
    groupId: message.groupId,
    lastAt: message.createdAt,
    lastMessage: message
  }
}

/** True when `incoming` should replace `current` as the session preview. */
export function shouldReplaceDmPreview(
  current: DmMessagePreview | undefined,
  incoming: ChatMessage
): boolean {
  if (!current?.lastMessage) return true
  const prev = current.lastMessage
  if (incoming.lamportTs > prev.lamportTs) return true
  if (incoming.lamportTs < prev.lamportTs) return false
  return incoming.createdAt >= prev.createdAt
}
