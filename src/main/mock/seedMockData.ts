import { randomUUID } from 'crypto'
import type { Database } from 'better-sqlite3'
import type { ChatMessage, MessageType } from '../../shared/chat/types'
import type { Task } from '../../shared/task/types'
import { MOCK_CATALOG_VERSION, MOCK_GROUPS, isMockGroupId } from '../../shared/group/mock'
import { getSetupStatus } from '../identity/setup'
import {
  getGroupById,
  insertGroup,
  insertGroupMember,
  listGroupMembers,
  updateGroupCreatedBy
} from '../storage/repositories/groupRepository'
import { upsertUser } from '../storage/repositories/userRepository'
import { insertTask, listTasksByGroup } from '../storage/repositories/taskRepository'
import {
  deleteAllMessagesInGroup,
  insertMessage,
  listMessagesByGroup
} from '../storage/repositories/messageRepository'
import { getMeta, setMeta } from '../storage/repositories/syncMetaRepository'
import { createBookmark } from '../file/bookmarkService'
import { listFilesByGroup } from '../storage/repositories/fileRepository'
import {
  appendAnonymousMessage,
  clearAnonymousSession,
  hasAnonymousSession,
  listAnonymousMessages
} from '../chat/anonymousChatStore'
import {
  MOCK_ANONYMOUS_MESSAGES,
  MOCK_CATALOG_META_KEY,
  MOCK_FUNCTION_BOOKMARKS,
  MOCK_FUNCTION_MESSAGES,
  MOCK_OWNER_SENDER,
  MOCK_PEER_USERS,
  MOCK_PROJECT_BOOKMARKS,
  MOCK_PROJECT_MESSAGES,
  MOCK_PROJECT_TASK_DEPS,
  MOCK_PROJECT_TASKS,
  MOCK_TASK_REF_TITLES,
  type MockMessageDef
} from './mockCatalog'
import { upsertDependency } from '../storage/repositories/taskDependencyRepository'

function ymdOffset(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function isoMinutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString()
}

function ensureMockPeerUsers(db: Database): void {
  const now = new Date().toISOString()
  for (const u of MOCK_PEER_USERS) {
    upsertUser(db, {
      userId: u.userId,
      displayName: u.displayName,
      baseName: u.baseName,
      createdAt: now,
      updatedAt: now
    })
  }
}

function ensureMockGroupShell(db: Database, groupId: string, name: string, type: string, ownerId: string): void {
  const now = new Date().toISOString()
  if (!getGroupById(db, groupId)) {
    insertGroup(db, {
      groupId,
      type: type as 'project' | 'function' | 'anonymous',
      name,
      createdBy: ownerId,
      createdAt: now,
      autoDiscover: true
    })
  } else {
    updateGroupCreatedBy(db, groupId, ownerId)
  }

  insertGroupMember(db, {
    groupId,
    userId: ownerId,
    role: 'owner',
    joinedAt: now
  })

  for (const peer of MOCK_PEER_USERS) {
    const existing = listGroupMembers(db, groupId).find((m) => m.userId === peer.userId)
    if (existing) continue
    const peerIndex = MOCK_PEER_USERS.findIndex((p) => p.userId === peer.userId)
    insertGroupMember(db, {
      groupId,
      userId: peer.userId,
      role: 'member',
      joinedAt: now,
      displayAlias: type === 'anonymous' ? `访客${peerIndex + 1}` : undefined
    })
  }
}

function resolveMockSender(senderUserId: string, ownerId: string): string {
  return senderUserId === MOCK_OWNER_SENDER ? ownerId : senderUserId
}

function insertMockMessage(
  db: Database,
  groupId: string,
  deviceId: string,
  def: MockMessageDef,
  lamportTs: number,
  ownerId: string
): void {
  const msg: ChatMessage = {
    msgId: `msg_mock_${randomUUID()}`,
    groupId,
    senderUserId: resolveMockSender(def.senderUserId, ownerId),
    senderDeviceId: deviceId,
    type: def.type as MessageType,
    content: def.content,
    lamportTs,
    createdAt: isoMinutesAgo(def.minutesAgo),
    deliveryStatus: 'sent'
  }
  insertMessage(db, msg)
}

function wipeMockGroupContent(db: Database, groupId: string, type: string): void {
  deleteAllMessagesInGroup(db, groupId)
  if (type === 'project' || type === 'function') {
    db.prepare(`DELETE FROM task_dependencies WHERE from_task_id IN (SELECT task_id FROM tasks WHERE group_id = ?)`).run(
      groupId
    )
    db.prepare(`DELETE FROM tasks WHERE group_id = ?`).run(groupId)
    db.prepare(`DELETE FROM files WHERE group_id = ? AND is_bookmark = 1`).run(groupId)
  }
}

function seedProjectTasks(db: Database, groupId: string, ownerId: string): void {
  if (listTasksByGroup(db, groupId).length > 0) return
  const ts = new Date().toISOString()
  const titleToId = new Map<string, string>()

  for (const def of MOCK_PROJECT_TASKS) {
    const taskId = `task_mock_${randomUUID()}`
    titleToId.set(def.title, taskId)
    const task: Task = {
      taskId,
      groupId,
      parentTaskId: def.parentTitle ? titleToId.get(def.parentTitle) : undefined,
      title: def.title,
      status: def.status,
      priority: def.priority,
      progressPercent: def.progressPercent,
      startDate: ymdOffset(def.startOffsetDays),
      endDate: ymdOffset(def.endOffsetDays),
      milestone: def.milestone ?? false,
      sortOrder: def.sortOrder,
      assigneeUserId: def.assigneeUserId,
      createdBy: ownerId,
      createdAt: ts,
      updatedAt: ts,
      description: def.description,
      otherReason: def.otherReason
    }
    insertTask(db, task)
  }
}

function seedProjectTaskDependencies(db: Database, groupId: string): void {
  const tasks = listTasksByGroup(db, groupId)
  const titleToId = new Map(tasks.map((t) => [t.title, t.taskId]))
  for (const dep of MOCK_PROJECT_TASK_DEPS) {
    const fromTaskId = titleToId.get(dep.fromTitle)
    const toTaskId = titleToId.get(dep.toTitle)
    if (!fromTaskId || !toTaskId) continue
    try {
      upsertDependency(db, {
        groupId,
        fromTaskId,
        toTaskId,
        type: dep.type
      })
    } catch {
      /* ignore duplicate / cycle */
    }
  }
}

function seedSqlMessages(
  db: Database,
  groupId: string,
  deviceId: string,
  ownerId: string,
  defs: MockMessageDef[]
): void {
  if (listMessagesByGroup(db, groupId).length > 0) return
  let lamport = 1
  for (const def of defs) {
    insertMockMessage(db, groupId, deviceId, def, lamport++, ownerId)
  }
}

function seedTaskRefMessages(db: Database, groupId: string, deviceId: string, ownerId: string): void {
  const tasks = listTasksByGroup(db, groupId)
  let lamport =
    listMessagesByGroup(db, groupId).reduce((max, m) => Math.max(max, m.lamportTs), 0) + 1
  const minutes = [28, 22, 18, 14]
  let i = 0
  for (const titleKey of MOCK_TASK_REF_TITLES) {
    const target = tasks.find((t) => t.title.includes(titleKey) || t.title === titleKey)
    if (!target) continue
    const existing = listMessagesByGroup(db, groupId).some(
      (m) => m.content.kind === 'task_ref' && m.content.taskId === target.taskId
    )
    if (existing) continue
    insertMockMessage(
      db,
      groupId,
      deviceId,
      {
        senderUserId: i % 2 === 0 ? 'demo-alice' : 'demo-bob',
        type: 'task_ref',
        content: { kind: 'task_ref', taskId: target.taskId, title: target.title },
        minutesAgo: minutes[i] ?? 12
      },
      lamport++,
      ownerId
    )
    i++
  }
}

function seedBookmarkShareMessages(
  db: Database,
  groupId: string,
  deviceId: string,
  ownerId: string
): void {
  const bookmarks = listFilesByGroup(db, groupId).filter((f) => f.isBookmark)
  if (bookmarks.length === 0) return
  const hasFileMsg = listMessagesByGroup(db, groupId).some((m) => m.content.kind === 'file')
  if (hasFileMsg) return

  let lamport =
    listMessagesByGroup(db, groupId).reduce((max, m) => Math.max(max, m.lamportTs), 0) + 1
  const sharers = ['demo-alice', 'demo-bob', MOCK_OWNER_SENDER]
  const toShare = bookmarks.slice(0, Math.min(3, bookmarks.length))
  for (let i = 0; i < toShare.length; i++) {
    const bm = toShare[i]
    const msg: ChatMessage = {
      msgId: `msg_mock_${randomUUID()}`,
      groupId,
      senderUserId: resolveMockSender(sharers[i] ?? 'demo-alice', ownerId),
      senderDeviceId: deviceId,
      type: 'file',
      content: {
        kind: 'file',
        fileId: bm.fileId,
        fileName: bm.name,
        size: bm.size
      },
      lamportTs: lamport++,
      createdAt: isoMinutesAgo(16 - i * 3),
      deliveryStatus: 'sent'
    }
    insertMessage(db, msg)
  }
}

function seedBookmarks(
  db: Database,
  groupId: string,
  defs: { title: string; url: string }[]
): void {
  if (listFilesByGroup(db, groupId).some((f) => f.isBookmark)) return
  for (const b of defs) {
    try {
      createBookmark(db, groupId, b.url, b.title)
    } catch {
      /* ignore duplicate / validation */
    }
  }
}

function seedAnonymousMessages(groupId: string, deviceId: string, ownerId: string): void {
  if (hasAnonymousSession(groupId) && listAnonymousMessages(groupId).length > 0) return
  let lamport = 1
  for (const def of MOCK_ANONYMOUS_MESSAGES) {
    const msg: ChatMessage = {
      msgId: `msg_mock_${randomUUID()}`,
      groupId,
      senderUserId: resolveMockSender(def.senderUserId, ownerId),
      senderDeviceId: deviceId,
      type: 'text',
      content: def.content,
      lamportTs: lamport++,
      createdAt: isoMinutesAgo(def.minutesAgo),
      deliveryStatus: 'sent'
    }
    appendAnonymousMessage(groupId, msg)
  }
}

function seedGroupContent(db: Database, groupId: string, type: string, ownerId: string, deviceId: string): void {
  if (type === 'project') {
    seedProjectTasks(db, groupId, ownerId)
    seedProjectTaskDependencies(db, groupId)
    seedSqlMessages(db, groupId, deviceId, ownerId, MOCK_PROJECT_MESSAGES)
    seedTaskRefMessages(db, groupId, deviceId, ownerId)
    seedBookmarks(db, groupId, MOCK_PROJECT_BOOKMARKS)
    seedBookmarkShareMessages(db, groupId, deviceId, ownerId)
    return
  }
  if (type === 'function') {
    seedSqlMessages(db, groupId, deviceId, ownerId, MOCK_FUNCTION_MESSAGES)
    seedBookmarks(db, groupId, MOCK_FUNCTION_BOOKMARKS)
    seedBookmarkShareMessages(db, groupId, deviceId, ownerId)
    return
  }
  if (type === 'anonymous') {
    seedAnonymousMessages(groupId, deviceId, ownerId)
  }
}

function shouldReseed(db: Database): boolean {
  const stored = getMeta(db, MOCK_CATALOG_META_KEY)
  return stored !== MOCK_CATALOG_VERSION
}

function markSeeded(db: Database): void {
  setMeta(db, MOCK_CATALOG_META_KEY, MOCK_CATALOG_VERSION)
}

/** 启动 / Setup 后：确保演示群存在、当前用户为群主，并注入 mock 内容 */
export function ensureMockCatalog(db: Database): void {
  const status = getSetupStatus(db)
  if (!status.configured || !status.user || !status.device) return

  const ownerId = status.user.userId
  const deviceId = status.device.deviceId
  const reseed = shouldReseed(db)

  ensureMockPeerUsers(db)

  for (const mock of MOCK_GROUPS) {
    ensureMockGroupShell(db, mock.groupId, mock.name, mock.type, ownerId)
    if (reseed) {
      wipeMockGroupContent(db, mock.groupId, mock.type)
      if (mock.type === 'anonymous') {
        clearAnonymousSession(mock.groupId)
      }
    }
    seedGroupContent(db, mock.groupId, mock.type, ownerId, deviceId)
  }

  if (reseed) markSeeded(db)
}

export { isMockGroupId }
