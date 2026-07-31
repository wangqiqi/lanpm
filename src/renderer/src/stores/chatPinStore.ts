import { create } from 'zustand'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'

interface ChatPinState {
  pinnedByGroup: Record<string, string[]>
  loadPins: (groupId: string) => Promise<void>
  togglePin: (groupId: string, msgId: string) => Promise<string[]>
  setPins: (groupId: string, msgIds: string[]) => void
}

export const useChatPinStore = create<ChatPinState>((set) => ({
  pinnedByGroup: {},
  loadPins: async (groupId) => {
    const msgIds = await getLanpmApi().chat.listPinnedIds(groupId)
    set((s) => ({ pinnedByGroup: { ...s.pinnedByGroup, [groupId]: msgIds } }))
  },
  togglePin: async (groupId, msgId) => {
    const msgIds = await getLanpmApi().chat.togglePin(groupId, msgId)
    set((s) => ({ pinnedByGroup: { ...s.pinnedByGroup, [groupId]: msgIds } }))
    return msgIds
  },
  setPins: (groupId, msgIds) => {
    set((s) => ({ pinnedByGroup: { ...s.pinnedByGroup, [groupId]: msgIds } }))
  }
}))
