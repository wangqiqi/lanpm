/** Max pinned messages per group (product cap). */
export const MAX_PINNED_MESSAGES_PER_GROUP = 20

export interface ChatPinPayload {
  groupId: string
  msgIds: string[]
  updatedAt: string
  updatedBy: string
}

export function togglePinId(msgIds: string[], msgId: string): string[] {
  if (msgIds.includes(msgId)) {
    return msgIds.filter((id) => id !== msgId)
  }
  const next = [...msgIds, msgId]
  if (next.length > MAX_PINNED_MESSAGES_PER_GROUP) {
    return next.slice(next.length - MAX_PINNED_MESSAGES_PER_GROUP)
  }
  return next
}

export function isMessagePinned(msgIds: string[], msgId: string): boolean {
  return msgIds.includes(msgId)
}

/** LWW merge for incoming pin sync. */
export function mergePinPayload(
  local: ChatPinPayload | null,
  incoming: ChatPinPayload
): ChatPinPayload {
  if (!local) return incoming
  if (incoming.updatedAt >= local.updatedAt) return incoming
  return local
}
