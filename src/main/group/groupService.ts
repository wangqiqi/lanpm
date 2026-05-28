import { randomUUID } from 'crypto'
import type { Database } from 'better-sqlite3'
import { BrowserWindow } from 'electron'
import type { CreateGroupInput, GroupRecord } from '../../shared/group/types'
import type { GroupType } from '../../shared/navigation/types'
import { GROUP_PUSH_CHANNEL } from '../../shared/group/channels'
import { getSetupStatus } from '../identity/setup'
import {
  countAnonymousAliases,
  countGroups,
  getGroupById,
  insertGroup,
  insertGroupMember,
  listGroups,
  listGroupMembers,
  removeGroupMember
} from '../storage/repositories/groupRepository'
import { clearAnonymousSession } from '../chat/anonymousChatStore'

const SEED_GROUPS: { groupId: string; name: string; type: GroupType }[] = [
  { groupId: 'demo-project', name: '示例项目', type: 'project' },
  { groupId: 'demo-function', name: '示例职能群', type: 'function' },
  { groupId: 'demo-anonymous', name: '示例匿名群', type: 'anonymous' }
]

function broadcastGroupsChanged(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(GROUP_PUSH_CHANNEL)
  }
}

export function ensureSeedGroups(db: Database): void {
  if (countGroups(db) > 0) {
    ensureUserInSeedGroups(db)
    return
  }
  const status = getSetupStatus(db)
  const creator = status.configured && status.user ? status.user.userId : 'system'
  const now = new Date().toISOString()

  for (const seed of SEED_GROUPS) {
    insertGroup(db, {
      groupId: seed.groupId,
      type: seed.type,
      name: seed.name,
      createdBy: creator,
      createdAt: now,
      autoDiscover: true
    })
    if (status.configured && status.user) {
      joinGroupMember(db, seed.groupId, status.user.userId, seed.type === 'anonymous')
    }
  }
}

function ensureUserInSeedGroups(db: Database): void {
  const status = getSetupStatus(db)
  if (!status.configured || !status.user) return
  for (const seed of SEED_GROUPS) {
    if (getGroupById(db, seed.groupId)) {
      joinGroupMember(db, seed.groupId, status.user.userId, seed.type === 'anonymous')
    }
  }
}

function nextAnonymousAlias(db: Database, groupId: string): string {
  const n = countAnonymousAliases(db, groupId) + 1
  return `访客${n}`
}

function joinGroupMember(db: Database, groupId: string, userId: string, anonymous: boolean): void {
  const group = getGroupById(db, groupId)
  if (!group) return
  const existing = listGroupMembers(db, groupId).find((m) => m.userId === userId)
  if (existing) return

  insertGroupMember(db, {
    groupId,
    userId,
    role: group.createdBy === userId ? 'owner' : 'member',
    joinedAt: new Date().toISOString(),
    displayAlias: anonymous ? nextAnonymousAlias(db, groupId) : undefined
  })
}

export function listUserGroups(db: Database): GroupRecord[] {
  ensureSeedGroups(db)
  return listGroups(db)
}

export function createUserGroup(db: Database, input: CreateGroupInput): GroupRecord {
  const status = getSetupStatus(db)
  if (!status.configured || !status.user) {
    throw new Error('请先完成身份配置')
  }

  const name = input.name.trim()
  if (name.length < 2 || name.length > 40) {
    throw new Error('群组名称须为 2–40 个字符')
  }

  const groupId = `grp_${randomUUID()}`
  const now = new Date().toISOString()
  const group: GroupRecord = {
    groupId,
    type: input.type,
    name,
    createdBy: status.user.userId,
    createdAt: now,
    autoDiscover: input.autoDiscover ?? true
  }

  insertGroup(db, group)
  joinGroupMember(db, groupId, status.user.userId, input.type === 'anonymous')
  broadcastGroupsChanged()
  return group
}

export function resolveGroupType(db: Database, groupId: string): GroupType {
  if (groupId.startsWith('dm:')) return 'anonymous'
  const group = getGroupById(db, groupId)
  if (group) return group.type
  const seed = SEED_GROUPS.find((g) => g.groupId === groupId)
  return seed?.type ?? 'project'
}

export function leaveAnonymousGroup(db: Database, groupId: string): void {
  const group = getGroupById(db, groupId)
  if (!group || group.type !== 'anonymous') return

  const status = getSetupStatus(db)
  if (status.configured && status.user) {
    removeGroupMember(db, groupId, status.user.userId)
  }
  clearAnonymousSession(groupId)
}

export function enterAnonymousGroup(db: Database, groupId: string): void {
  const group = getGroupById(db, groupId)
  if (!group || group.type !== 'anonymous') return

  const status = getSetupStatus(db)
  if (!status.configured || !status.user) return

  clearAnonymousSession(groupId)
  removeGroupMember(db, groupId, status.user.userId)
  joinGroupMember(db, groupId, status.user.userId, true)
}

export { getGroupById, listGroupMembers }
