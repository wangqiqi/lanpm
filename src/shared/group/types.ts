import type { GroupType } from '../navigation/types'

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
