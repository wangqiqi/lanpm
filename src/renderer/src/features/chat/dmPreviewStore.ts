import { create } from 'zustand'
import { isDmGroupId } from '@shared/chat/dmSession'
import {
  dmPreviewFromMessage,
  shouldReplaceDmPreview,
  type DmMessagePreview
} from '@shared/chat/dmPreview'
import type { ChatMessage } from '@shared/chat/types'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'

interface DmPreviewState {
  byGroup: Record<string, DmMessagePreview>
  loading: boolean
  refresh: () => Promise<void>
  patchFromMessage: (message: ChatMessage) => void
  getPreview: (groupId: string) => DmMessagePreview | undefined
}

export const useDmPreviewStore = create<DmPreviewState>()((set, get) => ({
  byGroup: {},
  loading: false,
  refresh: async () => {
    set({ loading: true })
    try {
      const rows = await getLanpmApi().chat.listDmPreviews()
      const byGroup: Record<string, DmMessagePreview> = {}
      for (const row of rows) {
        byGroup[row.groupId] = row
      }
      set({ byGroup })
    } finally {
      set({ loading: false })
    }
  },
  patchFromMessage: (message) => {
    if (!isDmGroupId(message.groupId)) return
    set((state) => {
      const current = state.byGroup[message.groupId]
      if (!shouldReplaceDmPreview(current, message)) return state
      return {
        byGroup: {
          ...state.byGroup,
          [message.groupId]: dmPreviewFromMessage(message)
        }
      }
    })
  },
  getPreview: (groupId) => get().byGroup[groupId]
}))
