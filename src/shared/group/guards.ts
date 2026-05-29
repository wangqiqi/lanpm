import type { GroupType } from '../navigation/types'

export function isAnonymousGroupType(type: GroupType): boolean {
  return type === 'anonymous'
}

/** 内存匿名群（非 DM）：仅文本、不走常规持久化聊天链路 */
export function isMemoryOnlyChatGroup(groupId: string, type: GroupType): boolean {
  if (groupId.startsWith('dm:')) return false
  return isAnonymousGroupType(type)
}

export function assertGroupAllowsTasks(type: GroupType): void {
  if (type === 'anonymous') throw new Error('匿名群不支持任务')
  if (type === 'function') throw new Error('职能群不支持看板任务')
}

export function assertGroupAllowsFiles(type: GroupType, groupId?: string): void {
  if (groupId?.startsWith('dm:')) return
  if (type === 'anonymous') throw new Error('匿名群不支持文件')
}
