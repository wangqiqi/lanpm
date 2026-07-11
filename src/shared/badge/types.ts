export interface GroupTabBadges {
  chatUnread: number
  /** 指派给本地用户且 status ∈ {todo, doing} 的未删除任务数 */
  boardMineOpen: number
  /**
   * 群内未删除任务的最大 updatedAt（ISO）；无任务则为 null。
   * 弱红点由客户端结合 lastBoardSeenAt / 48h 窗口计算。
   */
  boardLatestUpdatedAt: string | null
}

export const BADGE_IPC = {
  getGroupTabBadges: 'badge:getGroupTabBadges'
} as const
