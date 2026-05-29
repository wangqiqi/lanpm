export interface GroupTabBadges {
  chatUnread: number
  boardTodo: number
}

export const BADGE_IPC = {
  getGroupTabBadges: 'badge:getGroupTabBadges'
} as const
