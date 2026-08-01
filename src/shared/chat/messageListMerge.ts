import type { ChatMessage } from './types'

/** Renderer 侧每群内存软上限（`docs/优化.md` §6 序 7） */
export const CHAT_MEMORY_WINDOW = 2000

export function compareChatMessages(a: ChatMessage, b: ChatMessage): number {
  return a.lamportTs - b.lamportTs || a.createdAt.localeCompare(b.createdAt)
}

export function sortChatMessages(list: ChatMessage[]): ChatMessage[] {
  return [...list].sort(compareChatMessages)
}

export function trimChatMemoryWindow(list: ChatMessage[]): ChatMessage[] {
  if (list.length <= CHAT_MEMORY_WINDOW) return list
  return list.slice(list.length - CHAT_MEMORY_WINDOW)
}

/**
 * 合并单条消息：追加尽量 O(1)；同 msgId 且排序键不变则原位 patch。
 */
export function mergeChatMessage(list: ChatMessage[], message: ChatMessage): ChatMessage[] {
  const idx = list.findIndex((m) => m.msgId === message.msgId)
  if (idx >= 0) {
    const prev = list[idx]!
    if (prev.lamportTs === message.lamportTs && prev.createdAt === message.createdAt) {
      if (prev === message) return list
      const next = [...list]
      next[idx] = message
      return trimChatMemoryWindow(next)
    }
    const next = [...list]
    next[idx] = message
    return trimChatMemoryWindow(sortChatMessages(next))
  }

  if (list.length === 0) return [message]

  const last = list[list.length - 1]!
  if (compareChatMessages(last, message) <= 0) {
    return trimChatMemoryWindow([...list, message])
  }

  return trimChatMemoryWindow(sortChatMessages([...list, message]))
}

export function mergeOlderChatMessages(existing: ChatMessage[], older: ChatMessage[]): ChatMessage[] {
  const byId = new Map(existing.map((m) => [m.msgId, m]))
  for (const m of older) {
    if (!byId.has(m.msgId)) byId.set(m.msgId, m)
  }
  return trimChatMemoryWindow(sortChatMessages([...byId.values()]))
}

/** 非当前群仅保留最后一条，供 DM 预览等 */
export function downgradeToLastMessage(list: ChatMessage[]): ChatMessage[] {
  if (list.length <= 1) return list
  return [list[list.length - 1]!]
}
