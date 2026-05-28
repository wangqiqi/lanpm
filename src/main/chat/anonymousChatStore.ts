import type { ChatMessage } from '../../shared/chat/types'

/** 匿名群消息仅驻留内存，退出/重进后清除（M5-02） */
const sessions = new Map<string, ChatMessage[]>()

export function listAnonymousMessages(groupId: string): ChatMessage[] {
  return [...(sessions.get(groupId) ?? [])]
}

export function appendAnonymousMessage(groupId: string, message: ChatMessage): void {
  const list = sessions.get(groupId) ?? []
  list.push(message)
  sessions.set(groupId, list)
}

export function clearAnonymousSession(groupId: string): void {
  sessions.delete(groupId)
}

export function hasAnonymousSession(groupId: string): boolean {
  return sessions.has(groupId)
}
