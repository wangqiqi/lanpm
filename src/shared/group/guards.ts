import type { GroupType } from '../navigation/types'

export function isAnonymousGroupType(type: GroupType): boolean {
  return type === 'anonymous'
}

/** 匿名群仅临时会话，不可发起持久化私聊 */
export function groupAllowsDirectMessage(type: GroupType): boolean {
  return !isAnonymousGroupType(type)
}

/** 内存匿名群（非 DM）：仅文本、不走常规持久化聊天链路 */
export function isMemoryOnlyChatGroup(groupId: string, type: GroupType): boolean {
  if (groupId.startsWith('dm:')) return false
  return isAnonymousGroupType(type)
}

export function assertGroupAllowsTasks(type: GroupType): void {
  if (type === 'anonymous') throw new Error('stub.anonymousNoTask')
  if (type === 'function') throw new Error('stub.functionNoTask')
}

export function assertGroupAllowsFiles(type: GroupType, groupId?: string): void {
  if (groupId?.startsWith('dm:')) return
  if (type === 'anonymous') throw new Error('err.anonymousNoFile')
}
