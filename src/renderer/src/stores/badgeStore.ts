import { create } from 'zustand'
import type { GroupTabBadges } from '@shared/badge/types'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'

const EMPTY_BADGES: GroupTabBadges = { chatUnread: 0, boardTodo: 0 }

interface BadgeStore {
  badges: GroupTabBadges
  refresh: (groupId: string) => Promise<void>
}

export const useBadgeStore = create<BadgeStore>((set) => ({
  badges: EMPTY_BADGES,
  refresh: async (groupId: string) => {
    if (!groupId) {
      set({ badges: EMPTY_BADGES })
      return
    }
    try {
      const badges = await getLanpmApi().badge.getGroupTabBadges(groupId)
      set({ badges })
    } catch {
      set({ badges: EMPTY_BADGES })
    }
  }
}))
