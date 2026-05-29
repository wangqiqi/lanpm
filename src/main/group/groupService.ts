import { randomUUID } from 'crypto'
import { unlinkSync } from 'fs'
import type { Database } from 'better-sqlite3'
import { BrowserWindow } from 'electron'
import type { CreateGroupInput, GroupRecord } from '../../shared/group/types'
import type { GroupType } from '../../shared/navigation/types'
import { GROUP_PUSH_CHANNEL } from '../../shared/group/channels'
import { MOCK_GROUPS } from '../../shared/group/mock'
import { LOCAL_REMOVED_PREFIX, REMOTE_PENDING_PREFIX } from '../../shared/file/sync'
import { getCachedGroup } from '../discover/discoverGroupRegistry'
import { getSetupStatus } from '../identity/setup'
import { ensureMockCatalog } from '../mock/seedMockData'
import {
  countAnonymousAliases,
  deleteGroupCascade,
  getGroupById,
  insertGroup,
  insertGroupMember,
  listGroups,
  listGroupMembers,
  removeGroupMember
} from '../storage/repositories/groupRepository'
import { listFilesByGroup } from '../storage/repositories/fileRepository'
import { clearAnonymousSession } from '../chat/anonymousChatStore'
import { purgeGroupKeyMeta } from '../crypto/groupKeyService'

function broadcastGroupsChanged(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(GROUP_PUSH_CHANNEL)
  }
}

export function ensureSeedGroups(db: Database): void {
  ensureMockCatalog(db)
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

function purgeGroupFilesFromDisk(db: Database, groupId: string): void {
  for (const meta of listFilesByGroup(db, groupId)) {
    if (meta.isBookmark) continue
    for (const path of [meta.storagePath, meta.previewPath]) {
      if (
        !path ||
        path.startsWith(REMOTE_PENDING_PREFIX) ||
        path.startsWith(LOCAL_REMOVED_PREFIX)
      ) {
        continue
      }
      try {
        unlinkSync(path)
      } catch {
        /* disk may already be gone */
      }
    }
  }
}

export function listUserGroups(db: Database): GroupRecord[] {
  ensureSeedGroups(db)
  return listGroups(db)
}

export function listDiscoverableGroupsForAdvert(db: Database): {
  groupId: string
  name: string
  type: GroupType
}[] {
  ensureSeedGroups(db)
  return listGroups(db)
    .filter((g) => g.autoDiscover)
    .map((g) => ({ groupId: g.groupId, name: g.name, type: g.type }))
}

export function joinDiscoverableGroup(db: Database, groupId: string): GroupRecord {
  const status = getSetupStatus(db)
  if (!status.configured || !status.user) {
    throw new Error('请先完成身份配置')
  }

  let group = getGroupById(db, groupId)
  if (!group) {
    const cached = getCachedGroup(groupId)
    if (!cached) {
      throw new Error('未在局域网发现该群组，请刷新后重试')
    }
    const now = new Date().toISOString()
    group = {
      groupId: cached.advert.groupId,
      type: cached.advert.type,
      name: cached.advert.name,
      createdBy: cached.ownerUserId,
      createdAt: now,
      autoDiscover: true
    }
    insertGroup(db, group)
  }

  joinGroupMember(db, groupId, status.user.userId, group.type === 'anonymous')
  broadcastGroupsChanged()
  return group
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

export function dissolveGroup(db: Database, groupId: string): void {
  const status = getSetupStatus(db)
  if (!status.configured || !status.user) {
    throw new Error('请先完成身份配置')
  }
  if (groupId.startsWith('dm:')) {
    throw new Error('无法解散私信会话')
  }

  const group = getGroupById(db, groupId)
  if (!group) {
    throw new Error('群组不存在')
  }
  if (group.createdBy !== status.user.userId) {
    throw new Error('仅群主可解散群组')
  }

  purgeGroupFilesFromDisk(db, groupId)
  purgeGroupKeyMeta(db, groupId)
  clearAnonymousSession(groupId)
  deleteGroupCascade(db, groupId)
  broadcastGroupsChanged()
}

export function resolveGroupType(db: Database, groupId: string): GroupType {
  if (groupId.startsWith('dm:')) return 'anonymous'
  const group = getGroupById(db, groupId)
  if (group) return group.type
  const mock = MOCK_GROUPS.find((g) => g.groupId === groupId)
  return mock?.type ?? 'project'
}

export function leaveAnonymousGroup(db: Database, groupId: string): void {
  const group = getGroupById(db, groupId)
  if (!group || group.type !== 'anonymous') return

  const status = getSetupStatus(db)
  if (status.configured && status.user) {
    removeGroupMember(db, groupId, status.user.userId)
    purgeGroupKeyMeta(db, groupId)
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
