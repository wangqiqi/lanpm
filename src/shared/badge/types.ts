export interface GroupTabBadges {
  chatUnread: number
  /** 指派给本地用户且 status ∈ {todo, doing} 的未删除任务数 */
  boardMineOpen: number
}

export const BADGE_IPC = {
  getGroupTabBadges: 'badge:getGroupTabBadges'
} as const
