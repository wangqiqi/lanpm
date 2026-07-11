import { create } from 'zustand'
import type { GroupTabBadges } from '@shared/badge/types'
import { shouldShowBoardRecentDot } from '@shared/badge/boardRecentDot'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { getLastBoardSeenAt, markBoardSeen } from '@renderer/stores/boardSeenStore'

const EMPTY_BADGES: GroupTabBadges = {
  chatUnread: 0,
  boardMineOpen: 0,
  boardLatestUpdatedAt: null
}

interface BadgeStore {
  badges: GroupTabBadges
  /** 合成后的弱红点（数字优先时为 false） */
  boardRecentDot: boolean
  refresh: (groupId: string) => Promise<void>
  markBoardSeenAndRefresh: (groupId: string) => Promise<void>
}

function computeDot(badges: GroupTabBadges, groupId: string): boolean {
  return shouldShowBoardRecentDot({
    boardMineOpen: badges.boardMineOpen,
    boardLatestUpdatedAt: badges.boardLatestUpdatedAt,
    lastBoardSeenAt: getLastBoardSeenAt(groupId),
    nowIso: new Date().toISOString()
  })
}

export const useBadgeStore = create<BadgeStore>((set) => ({
  badges: EMPTY_BADGES,
  boardRecentDot: false,
  refresh: async (groupId: string) => {
    if (!groupId) {
      set({ badges: EMPTY_BADGES, boardRecentDot: false })
      return
    }
    try {
      const badges = await getLanpmApi().badge.getGroupTabBadges(groupId)
      set({ badges, boardRecentDot: computeDot(badges, groupId) })
    } catch {
      set({ badges: EMPTY_BADGES, boardRecentDot: false })
    }
  },
  markBoardSeenAndRefresh: async (groupId: string) => {
    if (!groupId) return
    markBoardSeen(groupId)
    const { refresh } = useBadgeStore.getState()
    await refresh(groupId)
  }
}))
