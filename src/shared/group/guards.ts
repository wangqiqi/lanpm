import type { GroupType } from '../navigation/types'

export function isAnonymousGroupType(type: GroupType): boolean {
  return type === 'anonymous'
}

export function assertGroupAllowsTasks(type: GroupType): void {
  if (type === 'anonymous') throw new Error('匿名群不支持任务')
  if (type === 'function') throw new Error('职能群不支持看板任务')
}

export function assertGroupAllowsFiles(type: GroupType, groupId?: string): void {
  if (groupId?.startsWith('dm:')) throw new Error('私聊不支持文件')
  if (type === 'anonymous') throw new Error('匿名群不支持文件')
}
