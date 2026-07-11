import type { GroupType } from '../navigation/types'

/** 新建群默认不开放局域网发现（更保守；用户可显式开启） */
export const DEFAULT_GROUP_AUTO_DISCOVER = false

export interface GroupRecord {
  groupId: string
  type: GroupType
  name: string
  createdBy: string
  createdAt: string
  autoDiscover: boolean
}

export interface GroupMemberRecord {
  groupId: string
  userId: string
  role: 'owner' | 'member'
  joinedAt: string
  displayAlias?: string
}

export interface CreateGroupInput {
  type: GroupType
  name: string
  autoDiscover?: boolean
}
