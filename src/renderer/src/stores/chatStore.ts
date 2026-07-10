import { create } from 'zustand'
import type { ChatMessage } from '@shared/chat/types'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'

interface ChatState {
  messagesByGroup: Record<string, ChatMessage[]>
  hasMoreByGroup: Record<string, boolean>
  loading: Record<string, boolean>
  loadingOlder: Record<string, boolean>
  loadError: Record<string, boolean>
  loadMessages: (groupId: string) => Promise<void>
  loadOlderMessages: (groupId: string) => Promise<void>
  clearLoadError: (groupId: string) => void
  sendText: (groupId: string, text: string) => Promise<void>
  sendCode: (groupId: string, code: string, languageHint?: string) => Promise<void>
  pickAndSendFile: (groupId: string) => Promise<void>
  sendFile: (groupId: string, filePath: string) => Promise<void>
  sendExistingFile: (groupId: string, fileId: string) => Promise<void>
  captureAndSendScreenshot: (groupId: string) => Promise<void>
  recallMessage: (groupId: string, msgId: string) => Promise<void>
  retryMessage: (msgId: string) => Promise<ChatMessage>
  sendTaskRef: (groupId: string, taskId: string) => Promise<void>
  upsertMessage: (message: ChatMessage) => void
  /** DATA-CHATSTORE-EVICT — 本机清理后丢弃内存缓存 */
  evictGroup: (groupId: string) => void
}

function sortMessages(list: ChatMessage[]): ChatMessage[] {
  return [...list].sort((a, b) => a.lamportTs - b.lamportTs || a.createdAt.localeCompare(b.createdAt))
}

function mergeMessage(list: ChatMessage[], message: ChatMessage): ChatMessage[] {
  const idx = list.findIndex((m) => m.msgId === message.msgId)
  if (idx >= 0) {
    const next = [...list]
    next[idx] = message
    return sortMessages(next)
  }
  return sortMessages([...list, message])
}

function mergeOlder(existing: ChatMessage[], older: ChatMessage[]): ChatMessage[] {
  const byId = new Map(existing.map((m) => [m.msgId, m]))
  for (const m of older) {
    if (!byId.has(m.msgId)) byId.set(m.msgId, m)
  }
  return sortMessages([...byId.values()])
}

export const useChatStore = create<ChatState>((set, get) => ({
  messagesByGroup: {},
  hasMoreByGroup: {},
  loading: {},
  loadingOlder: {},
  loadError: {},
  clearLoadError: (groupId) =>
    set((s) => ({ loadError: { ...s.loadError, [groupId]: false } })),
  loadMessages: async (groupId) => {
    set((s) => ({
      loading: { ...s.loading, [groupId]: true },
      loadError: { ...s.loadError, [groupId]: false }
    }))
    try {
      const page = await getLanpmApi().chat.listMessages(groupId)
      set((s) => ({
        messagesByGroup: { ...s.messagesByGroup, [groupId]: sortMessages(page.messages) },
        hasMoreByGroup: { ...s.hasMoreByGroup, [groupId]: page.hasMore }
      }))
    } catch {
      set((s) => ({ loadError: { ...s.loadError, [groupId]: true } }))
    } finally {
      set((s) => ({ loading: { ...s.loading, [groupId]: false } }))
    }
  },
  loadOlderMessages: async (groupId) => {
    const existing = get().messagesByGroup[groupId] ?? []
    if (!get().hasMoreByGroup[groupId] || existing.length === 0) return
    if (get().loadingOlder[groupId]) return
    const beforeLamportTs = existing[0]!.lamportTs
    set((s) => ({ loadingOlder: { ...s.loadingOlder, [groupId]: true } }))
    try {
      const page = await getLanpmApi().chat.loadOlderMessages(groupId, beforeLamportTs)
      set((s) => ({
        messagesByGroup: {
          ...s.messagesByGroup,
          [groupId]: mergeOlder(s.messagesByGroup[groupId] ?? [], page.messages)
        },
        hasMoreByGroup: { ...s.hasMoreByGroup, [groupId]: page.hasMore }
      }))
    } finally {
      set((s) => ({ loadingOlder: { ...s.loadingOlder, [groupId]: false } }))
    }
  },
  sendText: async (groupId, text) => {
    const message = await getLanpmApi().chat.sendText(groupId, text)
    get().upsertMessage(message)
  },
  sendCode: async (groupId, code, languageHint) => {
    const theme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
    const message = await getLanpmApi().chat.sendCode(groupId, code, languageHint, theme)
    get().upsertMessage(message)
  },
  pickAndSendFile: async (groupId) => {
    const message = await getLanpmApi().chat.pickAndSendFile(groupId)
    if (message) get().upsertMessage(message)
  },
  sendFile: async (groupId, filePath) => {
    const message = await getLanpmApi().chat.sendFile(groupId, filePath)
    get().upsertMessage(message)
  },
  sendExistingFile: async (groupId, fileId) => {
    const message = await getLanpmApi().chat.sendExistingFile(groupId, fileId)
    get().upsertMessage(message)
  },
  captureAndSendScreenshot: async (groupId) => {
    const message = await getLanpmApi().chat.captureAndSendScreenshot(groupId)
    if (message) get().upsertMessage(message)
  },
  recallMessage: async (groupId, msgId) => {
    const message = await getLanpmApi().chat.recallMessage(groupId, msgId)
    get().upsertMessage(message)
  },
  retryMessage: async (msgId) => {
    const message = await getLanpmApi().chat.retryMessage(msgId)
    get().upsertMessage(message)
    return message
  },
  sendTaskRef: async (groupId, taskId) => {
    const message = await getLanpmApi().chat.sendTaskRef(groupId, taskId)
    get().upsertMessage(message)
  },
  evictGroup: (groupId) => {
    set((s) => {
      const rest = { ...s.messagesByGroup }
      delete rest[groupId]
      const hasMore = { ...s.hasMoreByGroup }
      delete hasMore[groupId]
      return { messagesByGroup: rest, hasMoreByGroup: hasMore }
    })
  },
  upsertMessage: (message) => {
    set((s) => {
      const prev = s.messagesByGroup[message.groupId] ?? []
      return {
        messagesByGroup: {
          ...s.messagesByGroup,
          [message.groupId]: mergeMessage(prev, message)
        }
      }
    })
  }
}))
