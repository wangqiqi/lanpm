export interface GroupSortItem {
  groupId: string
  /** ISO；无消息时用创建时间 */
  createdAt?: string
  /** ISO；该群最后一条消息时间 */
  lastMessageAt?: string
  pinned: boolean
}

function activityKey(item: GroupSortItem): string {
  return item.lastMessageAt || item.createdAt || ''
}

/** 置顶优先，其余按活跃时间降序（无消息则 createdAt） */
export function compareGroupsForSwitcher(a: GroupSortItem, b: GroupSortItem): number {
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
  const aAct = activityKey(a)
  const bAct = activityKey(b)
  if (aAct !== bAct) return bAct.localeCompare(aAct)
  return a.groupId.localeCompare(b.groupId)
}

export function sortGroupsForSwitcher<T extends GroupSortItem>(items: T[]): T[] {
  return [...items].sort(compareGroupsForSwitcher)
}
