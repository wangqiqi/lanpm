import type { ChatMessage } from '@shared/chat/types'
import { CHAT_HISTORY_PAGE_SIZE } from '@shared/chat/pagination'
import type { GroupMemberView } from '@shared/chat/members'
import { canRecallMessage, toRecalledMessage } from '@shared/chat/recall'
import { parseMentions } from '@shared/chat/mentions'
import { detectLanguage } from '@shared/chat/detectLanguage'
import { isDmGroupId, parseDmGroupId } from '@shared/chat/dmSession'
import type { UserPresence } from '@shared/network/types'
import { parseHostPort } from '@shared/network/manualPeer'
import type { ProfileUpdateInput, SetupInput, SetupStatus } from '@shared/identity'
import { resolveDeviceName } from '@shared/identity/deviceName'

const BROWSER_PREVIEW_DEVICE = '开发预览'
import type { LanpmApi } from '@shared/lanpm-api'
import { randomAvatarDataUrl } from '@renderer/features/setup/avatar'
import { isMessageReadByOthers } from '@shared/chat/readReceipt'
import type { FileMeta } from '@shared/file/types'
import type { CreateTaskInput, Task, TaskStatus, UpdateTaskInput } from '@shared/task/types'
import { applyAggregatedProgress } from '@shared/task/progress'
import {
  clampProgressPercent,
  normalizeTaskTitle,
  validateOtherReason,
  validateTaskDateRange,
  validateTaskTitle
} from '@shared/task/validation'
import { stubError, stubT } from '@renderer/platform/stubTranslate'

const STORAGE_KEY = 'lanpm.dev.identity'
const CHAT_STORAGE_KEY = 'lanpm.dev.chat'
const TASK_STORAGE_KEY = 'lanpm.dev.tasks'
const READ_RECEIPT_KEY = 'lanpm.dev.readReceipts'
const FILE_STORAGE_KEY = 'lanpm.dev.files'
const STUB_DISSOLVED_GROUPS_KEY = 'lanpm.dev.dissolvedGroups'

const stubDissolvedGroups = new Set<string>(
  (() => {
    try {
      const raw = localStorage.getItem(STUB_DISSOLVED_GROUPS_KEY)
      if (!raw) return []
      return JSON.parse(raw) as string[]
    } catch {
      return []
    }
  })()
)

function persistStubDissolvedGroups(): void {
  localStorage.setItem(STUB_DISSOLVED_GROUPS_KEY, JSON.stringify([...stubDissolvedGroups]))
}

const taskListeners = new Set<(groupId: string) => void>()

function assertStubTaskWritable(groupId: string): void {
  if (groupId.startsWith('dm:')) throw stubError('stub.dmNoTask')
  if (groupId === 'demo-anonymous') throw stubError('stub.anonymousNoTask')
  if (groupId === 'demo-function') throw stubError('stub.functionNoTask')
}

function readAllTasks(): Record<string, Task[]> {
  try {
    const raw = localStorage.getItem(TASK_STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, Task[]>
  } catch {
    return {}
  }
}

function writeGroupTasks(groupId: string, tasks: Task[]): void {
  const all = readAllTasks()
  all[groupId] = tasks
  localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(all))
  for (const fn of taskListeners) fn(groupId)
}

function maxSortInColumn(tasks: Task[], status: TaskStatus): number {
  return tasks.filter((t) => t.status === status).reduce((m, t) => Math.max(m, t.sortOrder), -1)
}

function stubCreateTask(input: CreateTaskInput): Task {
  assertStubTaskWritable(input.groupId)
  const status = readStatus()
  if (!status.configured || !status.user) throw stubError('stub.identityRequired')
  const titleErr = validateTaskTitle(input.title)
  if (titleErr) throw new Error(titleErr)
  const title = normalizeTaskTitle(input.title)
  const prev = readAllTasks()[input.groupId] ?? []
  const taskStatus = input.status ?? 'todo'
  const task: Task = {
    taskId: `task_${crypto.randomUUID()}`,
    groupId: input.groupId,
    parentTaskId: input.parentTaskId,
    title,
    status: taskStatus,
    priority: input.priority ?? 'medium',
    assigneeUserId: input.assigneeUserId,
    progressPercent: clampProgressPercent(input.progressPercent ?? 0),
    sortOrder: maxSortInColumn(prev, taskStatus) + 1,
    createdBy: status.user.userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  const err = validateOtherReason(task.status, task.otherReason)
  if (err) throw new Error(err)
  writeGroupTasks(input.groupId, [...prev, task])
  return task
}

function stubUpdateTask(input: UpdateTaskInput): Task {
  const all = readAllTasks()
  let groupId = ''
  let tasks: Task[] = []
  for (const [gid, list] of Object.entries(all)) {
    if (list.some((t) => t.taskId === input.taskId)) {
      groupId = gid
      tasks = [...list]
      break
    }
  }
  if (!groupId) throw stubError('stub.taskNotFound')
  const idx = tasks.findIndex((t) => t.taskId === input.taskId)
  const existing = tasks[idx]!
  const nextStatus = input.status ?? existing.status
  const nextReason =
    input.otherReason !== undefined
      ? input.otherReason ?? undefined
      : input.status && input.status !== 'other'
        ? undefined
        : existing.otherReason
  const err = validateOtherReason(nextStatus, nextReason)
  if (err) throw new Error(err)
  if (input.title !== undefined) {
    const titleErr = validateTaskTitle(input.title)
    if (titleErr) throw new Error(titleErr)
  }
  const nextStart =
    input.startDate !== undefined ? input.startDate : existing.startDate ?? null
  const nextEnd = input.endDate !== undefined ? input.endDate : existing.endDate ?? null
  const dateErr = validateTaskDateRange(nextStart, nextEnd)
  if (dateErr) throw new Error(dateErr)
  tasks[idx] = {
    ...existing,
    title: input.title !== undefined ? normalizeTaskTitle(input.title) : existing.title,
    status: nextStatus,
    otherReason: nextReason,
    priority: input.priority ?? existing.priority,
    assigneeUserId:
      input.assigneeUserId === null
        ? undefined
        : input.assigneeUserId ?? existing.assigneeUserId,
    progressPercent:
      input.progressPercent !== undefined
        ? clampProgressPercent(input.progressPercent)
        : existing.progressPercent,
    parentTaskId:
      input.parentTaskId === null
        ? undefined
        : input.parentTaskId ?? existing.parentTaskId,
    sortOrder: input.sortOrder ?? existing.sortOrder,
    startDate:
      input.startDate === null
        ? undefined
        : input.startDate !== undefined
          ? input.startDate
          : existing.startDate,
    endDate:
      input.endDate === null
        ? undefined
        : input.endDate !== undefined
          ? input.endDate
          : existing.endDate,
    milestone: input.milestone ?? existing.milestone,
    updatedAt: new Date().toISOString()
  }
  writeGroupTasks(groupId, tasks)
  return applyAggregatedProgress(tasks).find((t) => t.taskId === input.taskId)!
}

function readChatMessages(groupId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY)
    if (!raw) return []
    const all = JSON.parse(raw) as Record<string, ChatMessage[]>
    return all[groupId] ?? []
  } catch {
    return []
  }
}

function writeChatMessages(groupId: string, messages: ChatMessage[]): void {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY)
    const all = raw ? (JSON.parse(raw) as Record<string, ChatMessage[]>) : {}
    all[groupId] = messages
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(all))
  } catch {
    /* ignore */
  }
}

function readAllFiles(): Record<string, FileMeta[]> {
  try {
    const raw = localStorage.getItem(FILE_STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, FileMeta[]>
  } catch {
    return {}
  }
}

function writeGroupFiles(groupId: string, files: FileMeta[]): void {
  try {
    const all = readAllFiles()
    all[groupId] = files
    localStorage.setItem(FILE_STORAGE_KEY, JSON.stringify(all))
  } catch {
    /* ignore */
  }
}

const chatListeners = new Set<(message: ChatMessage) => void>()

function readReceiptMap(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(READ_RECEIPT_KEY)
    return raw ? (JSON.parse(raw) as Record<string, string[]>) : {}
  } catch {
    return {}
  }
}

function writeReceiptMap(map: Record<string, string[]>): void {
  localStorage.setItem(READ_RECEIPT_KEY, JSON.stringify(map))
}

function applyReadStatus(messages: ChatMessage[], localUserId?: string): ChatMessage[] {
  const receipts = readReceiptMap()
  return messages.map((m) => {
    if (m.senderUserId !== localUserId) return m
    const readers = receipts[m.msgId] ?? []
    if (isMessageReadByOthers(m.senderUserId, readers) && m.deliveryStatus !== 'read') {
      return { ...m, deliveryStatus: 'read' as const }
    }
    return m
  })
}

const STUB_MEMBERS: GroupMemberView[] = [
  { userId: 'demo-alice', displayName: 'Alice', mentionKeys: ['alice'] },
  { userId: 'demo-bob', displayName: 'Bob', mentionKeys: ['bob'] },
  { userId: 'demo-carol', displayName: 'Carol', mentionKeys: ['carol'] }
]

const STUB_PRESENCE: Record<string, UserPresence> = {
  'demo-alice': 'away',
  'demo-bob': 'offline',
  'demo-carol': 'online'
}

function stubPresence(userId: string, localUserId?: string): UserPresence {
  if (localUserId && userId === localUserId) return 'online'
  return STUB_PRESENCE[userId] ?? 'offline'
}

function listStubMembers(groupId?: string): GroupMemberView[] {
  const status = readStatus()
  const localUserId = status.configured && status.user ? status.user.userId : undefined
  const members = [...STUB_MEMBERS]
  if (status.configured && status.user) {
    members.push({
      userId: status.user.userId,
      displayName: status.user.displayName,
      mentionKeys: [status.user.baseName, status.user.userId]
    })
  }

  const attach = (list: GroupMemberView[]): GroupMemberView[] =>
    list.map((m) => ({ ...m, presence: stubPresence(m.userId, localUserId) }))

  if (groupId && isDmGroupId(groupId)) {
    const pair = parseDmGroupId(groupId)
    if (!pair) return []
    const [userA, userB] = pair
    const byId = new Map(members.map((m) => [m.userId, m]))
    return attach(
      [userA, userB].map(
        (userId) =>
          byId.get(userId) ?? { userId, displayName: userId, mentionKeys: [userId] }
      )
    )
  }

  return attach(members)
}

function readStatus(): SetupStatus {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { configured: false }
    const parsed = JSON.parse(raw) as SetupStatus
    if (typeof parsed.configured === 'boolean') return parsed
  } catch {
    /* ignore */
  }
  return { configured: false }
}

function writeStatus(status: SetupStatus): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(status))
}

/** 浏览器预览默认身份，避免全屏遮罩挡住 #/g/.../chat 导致无法点击 */
function ensureDevPreviewIdentity(): SetupStatus {
  const existing = readStatus()
  if (existing.configured && existing.user && existing.device) {
    return existing
  }
  const status: SetupStatus = {
    configured: true,
    user: {
      userId: 'preview-user',
      displayName: '预览用户',
      baseName: '预览',
      suffix: '00',
      department: '开发预览',
      avatarUrl: randomAvatarDataUrl('预览')
    },
    device: {
      deviceId: 'dev-preview',
      deviceName: previewDeviceName()
    }
  }
  writeStatus(status)
  return status
}

/** 浏览器直连 Vite 时的身份 API 桩（无 Electron preload） */
function previewDeviceName(): string {
  return resolveDeviceName('', BROWSER_PREVIEW_DEVICE)
}

function readReadReceipts(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(READ_RECEIPT_KEY)
    return raw ? (JSON.parse(raw) as Record<string, string[]>) : {}
  } catch {
    return {}
  }
}

function stubGroupTabBadges(groupId: string): import('@shared/badge/types').GroupTabBadges {
  const status = readStatus()
  const userId = status.user?.userId
  let chatUnread = 0
  if (userId) {
    try {
      const raw = localStorage.getItem(CHAT_STORAGE_KEY)
      const store = raw
        ? (JSON.parse(raw) as Record<string, import('@shared/chat/types').ChatMessage[]>)
        : {}
      const receipts = readReadReceipts()
      for (const m of store[groupId] ?? []) {
        if (m.senderUserId === userId) continue
        const readers = receipts[m.msgId] ?? []
        if (!readers.includes(userId)) chatUnread++
      }
    } catch {
      /* ignore */
    }
  }
  const tasks = readAllTasks()[groupId] ?? []
  const boardTodo = tasks.filter((t) => t.status === 'todo').length
  return { chatUnread, boardTodo }
}

export function createBrowserLanpmStub(): LanpmApi {
  return {
    platform: 'browser',
    versions: {
      node: 'dev',
      chrome: 'dev',
      electron: 'dev'
    },
    getSuggestedDeviceName: previewDeviceName,
    identity: {
      getSetupStatus: async () => {
        if (import.meta.env.DEV) {
          return ensureDevPreviewIdentity()
        }
        const status = readStatus()
        if (!status.configured) {
          return {
            ...status,
            suggestedDeviceName: previewDeviceName()
          }
        }
        return status
      },
      completeSetup: async (input: SetupInput) => {
        const deviceName = previewDeviceName()
        const suffix = new Date().toISOString().slice(2, 4) + String(new Date().getMonth() + 1).padStart(2, '0')
        const userId = `${input.baseName}-${suffix}`
        const status: SetupStatus = {
          configured: true,
          user: {
            userId,
            displayName: input.baseName,
            baseName: input.baseName,
            suffix,
            department: input.department,
            avatarUrl: input.avatarUrl
          },
          device: {
            deviceId: `dev-${crypto.randomUUID().slice(0, 8)}`,
            deviceName
          }
        }
        writeStatus(status)
        return status
      },
      updateProfile: async (input: ProfileUpdateInput) => {
        const status = readStatus()
        if (!status.configured || !status.user || !status.device) {
          throw stubError('stub.identityRequired')
        }
        const baseName = input.baseName.trim()
        const suffix = status.user.suffix
        const displayName = suffix ? `${baseName}${suffix}` : baseName
        const next: SetupStatus = {
          configured: true,
          user: {
            ...status.user,
            baseName,
            displayName,
            department: input.department?.trim() || undefined,
            avatarUrl: input.avatarUrl ?? status.user.avatarUrl
          },
          device: status.device
        }
        writeStatus(next)
        return next
      },
      resetIdentity: async () => {
        const status: SetupStatus = {
          configured: false,
          suggestedDeviceName: previewDeviceName()
        }
        writeStatus(status)
        return status
      }
    },
    chat: {
      listMessages: async (groupId) => {
        const status = readStatus()
        const localUserId = status.configured && status.user ? status.user.userId : undefined
        const all = applyReadStatus(readChatMessages(groupId), localUserId)
        const hasMore = all.length > CHAT_HISTORY_PAGE_SIZE
        const messages = hasMore ? all.slice(-CHAT_HISTORY_PAGE_SIZE) : all
        return { messages, hasMore }
      },
      loadOlderMessages: async (groupId, beforeLamportTs) => {
        const status = readStatus()
        const localUserId = status.configured && status.user ? status.user.userId : undefined
        const all = applyReadStatus(readChatMessages(groupId), localUserId).filter(
          (m) => m.lamportTs < beforeLamportTs
        )
        const hasMore = all.length > CHAT_HISTORY_PAGE_SIZE
        const messages = hasMore ? all.slice(-CHAT_HISTORY_PAGE_SIZE) : all
        return { messages, hasMore }
      },
      sendText: async (groupId, text) => {
        const status = readStatus()
        if (!status.configured || !status.user || !status.device) {
          throw stubError('stub.identityRequired')
        }
        const trimmed = text.trim()
        if (!trimmed) throw stubError('stub.messageEmpty')
        const members = listStubMembers()
        const mentions = parseMentions(trimmed, members)
        const prev = readChatMessages(groupId)
        const lamportTs = (prev.at(-1)?.lamportTs ?? 0) + 1
        const msg: ChatMessage = {
          msgId: `msg_${crypto.randomUUID()}`,
          groupId,
          senderUserId: status.user.userId,
          senderDeviceId: status.device.deviceId,
          type: 'text',
          content: { kind: 'text', text: trimmed },
          lamportTs,
          createdAt: new Date().toISOString(),
          deliveryStatus: 'sent',
          mentions: mentions.length ? mentions : undefined
        }
        writeChatMessages(groupId, [...prev, msg])
        for (const fn of chatListeners) fn(msg)
        return msg
      },
      sendCode: async (groupId, code, languageHint, theme) => {
        const status = readStatus()
        if (!status.configured || !status.user || !status.device) {
          throw stubError('stub.identityRequired')
        }
        const trimmed = code.trim()
        if (!trimmed) throw stubError('stub.codeEmpty')
        const prev = readChatMessages(groupId)
        const lamportTs = (prev.at(-1)?.lamportTs ?? 0) + 1
        const language = detectLanguage(trimmed, languageHint)
        const msg: ChatMessage = {
          msgId: `msg_${crypto.randomUUID()}`,
          groupId,
          senderUserId: status.user.userId,
          senderDeviceId: status.device.deviceId,
          type: 'code',
          content: { kind: 'code', language, code: trimmed, theme },
          lamportTs,
          createdAt: new Date().toISOString(),
          deliveryStatus: 'sent'
        }
        writeChatMessages(groupId, [...prev, msg])
        for (const fn of chatListeners) fn(msg)
        return msg
      },
      listMembers: async (groupId) => listStubMembers(groupId),
      pickAndSendFile: async () => {
        throw stubError('stub.uploadElectronOnly')
      },
      sendFile: async () => {
        throw stubError('stub.uploadElectronOnly')
      },
      sendExistingFile: async () => {
        throw stubError('stub.uploadElectronOnly')
      },
      captureAndSendScreenshot: async () => {
        throw stubError('stub.screenshotElectronOnly')
      },
      recallMessage: async (groupId, msgId) => {
        const status = readStatus()
        if (!status.configured || !status.user) {
          throw stubError('stub.identityRequired')
        }
        const prev = readChatMessages(groupId)
        const existing = prev.find((m) => m.msgId === msgId)
        if (!existing) throw stubError('stub.messageNotFound')
        if (!canRecallMessage(existing, status.user.userId)) {
          throw stubError('stub.recallNotAllowed')
        }
        const updated = toRecalledMessage(existing, status.user.userId, new Date().toISOString())
        writeChatMessages(
          groupId,
          prev.map((m) => (m.msgId === msgId ? updated : m))
        )
        for (const fn of chatListeners) fn(updated)
        return updated
      },
      markRead: async (groupId, msgIds) => {
        const status = readStatus()
        if (!status.configured || !status.user) return
        const localUserId = status.user.userId
        const receipts = readReceiptMap()
        for (const msgId of msgIds) {
          const prev = readChatMessages(groupId)
          const msg = prev.find((m) => m.msgId === msgId)
          if (!msg || msg.senderUserId === localUserId) continue
          const readers = new Set(receipts[msgId] ?? [])
          readers.add(localUserId)
          receipts[msgId] = [...readers]
        }
        writeReceiptMap(receipts)
      },
      onMessage: (handler) => {
        chatListeners.add(handler)
        return () => chatListeners.delete(handler)
      }
    },
    task: {
      listTasks: async (groupId) => {
        const tasks = readAllTasks()[groupId] ?? []
        return applyAggregatedProgress(tasks)
      },
      createTask: async (input) => stubCreateTask(input),
      updateTask: async (input) => stubUpdateTask(input),
      moveTask: async (input) => {
        const all = readAllTasks()
        for (const list of Object.values(all)) {
          const existing = list.find((t) => t.taskId === input.taskId)
          if (!existing) continue
          const sortOrder =
            input.sortOrder ??
            (input.status !== existing.status
              ? maxSortInColumn(list, input.status) + 1
              : existing.sortOrder)
          return stubUpdateTask({
            taskId: input.taskId,
            status: input.status,
            sortOrder,
            otherReason: input.status === 'other' ? (input.otherReason ?? null) : null
          })
        }
        throw stubError('stub.taskNotFound')
      },
      createFromChat: async (groupId, title) => {
        const task = stubCreateTask({ groupId, title, status: 'todo' })
        const status = readStatus()
        if (!status.configured || !status.user || !status.device) {
          throw stubError('stub.identityRequired')
        }
        const prev = readChatMessages(groupId)
        const lamportTs = (prev.at(-1)?.lamportTs ?? 0) + 1
        const msg = {
          msgId: `msg_${crypto.randomUUID()}`,
          groupId,
          senderUserId: status.user.userId,
          senderDeviceId: status.device.deviceId,
          type: 'task_ref' as const,
          content: { kind: 'task_ref' as const, taskId: task.taskId, title: task.title },
          lamportTs,
          createdAt: new Date().toISOString(),
          deliveryStatus: 'sent' as const
        }
        writeChatMessages(groupId, [...prev, msg])
        for (const fn of chatListeners) fn(msg)
        return { task, message: msg }
      },
      updateSchedule: async (input) =>
        stubUpdateTask({
          taskId: input.taskId,
          startDate: input.startDate,
          endDate: input.endDate
        }),
      upsertDependency: async (input) => {
        void input
        throw stubError('stub.ganttDepsUnsupported')
      },
      removeDependency: async () => false,
      deleteTask: async (taskId) => {
        const all = readAllTasks()
        for (const [groupId, list] of Object.entries(all)) {
          if (!list.some((t) => t.taskId === taskId)) continue
          writeGroupTasks(
            groupId,
            list.filter((t) => t.taskId !== taskId)
          )
          return true
        }
        return false
      },
      onTasksChanged: (handler) => {
        taskListeners.add(handler)
        return () => taskListeners.delete(handler)
      }
    },
    file: {
      listFiles: async (groupId, category) => {
        const files = readAllFiles()[groupId] ?? []
        if (!category) return files
        return files.filter((f) => f.category === category)
      },
      upload: async () => {
        throw stubError('stub.uploadElectronOnly')
      },
      getPreviewUrl: async () => null,
      getPreviewText: async () => null,
      listTransfers: async () => [],
      listTransferHistory: async () => [],
      resumeTransfer: async (transferId) => {
        void transferId
        throw stubError('stub.uploadElectronOnly')
      },
      getTransferSettings: async () => ({ rateKbps: 0 }),
      setTransferRate: async (rateKbps) => ({ rateKbps }),
      addBookmark: async (groupId, url, title) => {
        const now = new Date().toISOString()
        const meta: FileMeta = {
          fileId: `stub_bm_${Date.now()}`,
          groupId,
          name: title || url,
          ext: 'url',
          category: 'bookmark',
          size: 0,
          uploadedBy: 'stub',
          uploadedAt: now,
          sha256: '',
          storagePath: '',
          previewStatus: 'ready',
          isBookmark: true,
          bookmarkUrl: url,
          bookmarkTitle: title || url,
          updatedAt: now
        }
        const files = readAllFiles()[groupId] ?? []
        writeGroupFiles(groupId, [...files, meta])
        return meta
      },
      importBookmarks: async () => [],
      exportBookmarks: async () => {
        throw stubError('stub.exportBookmarksElectronOnly')
      },
      pullRemote: async (fileId) => {
        void fileId
        throw stubError('stub.uploadElectronOnly')
      },
      download: async (fileId) => {
        void fileId
        throw stubError('stub.uploadElectronOnly')
      },
      deleteLocal: async (fileId) => {
        const all = readAllFiles()
        for (const [groupId, files] of Object.entries(all)) {
          const next = files.filter((f) => f.fileId !== fileId)
          if (next.length !== files.length) {
            writeGroupFiles(groupId, next)
            return true
          }
        }
        return false
      },
      onTransfersChanged: () => () => undefined
    },
    group: {
      list: async () => {
        const status = readStatus()
        const ownerId = status.user?.userId ?? 'stub'
        return [
          {
            groupId: 'demo-project',
            name: stubT('demo.groupProject'),
            type: 'project' as const,
            createdBy: ownerId,
            createdAt: '',
            autoDiscover: true
          },
          {
            groupId: 'demo-function',
            name: stubT('demo.groupFunction'),
            type: 'function' as const,
            createdBy: ownerId,
            createdAt: '',
            autoDiscover: true
          },
          {
            groupId: 'demo-anonymous',
            name: stubT('demo.groupAnonymous'),
            type: 'anonymous' as const,
            createdBy: ownerId,
            createdAt: '',
            autoDiscover: true
          }
        ].filter((g) => !stubDissolvedGroups.has(g.groupId))
      },
      create: async (input) => ({
        groupId: `stub_${Date.now()}`,
        type: input.type,
        name: input.name,
        createdBy: 'stub',
        createdAt: new Date().toISOString(),
        autoDiscover: input.autoDiscover ?? true
      }),
      join: async (groupId) => ({
        groupId,
        type: 'project' as const,
        name: 'LanPM 协作组',
        createdBy: 'demo-alice',
        createdAt: new Date().toISOString(),
        autoDiscover: true
      }),
      enterAnonymous: async () => undefined,
      leaveAnonymous: async () => undefined,
      dissolve: async (groupId) => {
        stubDissolvedGroups.add(groupId)
        persistStubDissolvedGroups()
      },
      onListChanged: () => () => undefined
    },
    cockpit: {
      getDashboard: async () => ({
        summary: { totalProjects: 1, inProgressCount: 2, delayedCount: 0 },
        projects: [
          {
            groupId: 'demo-project',
            name: stubT('demo.groupProject'),
            progressPercent: 50,
            status: 'normal' as const,
            inProgressCount: 2,
            delayedCount: 0,
            totalTasks: 4
          }
        ],
        departments: [{ department: '研发部', completionPercent: 75, taskCount: 4 }]
      }),
      generateWeeklyReport: async () => ({
        format: 'markdown' as const,
        content: '# Stub 周报',
        generatedAt: new Date().toISOString(),
        usedExternalAi: false
      }),
      generateMonthlyReport: async () => ({
        format: 'markdown' as const,
        content: '# Stub 月报',
        generatedAt: new Date().toISOString(),
        usedExternalAi: false
      }),
      evaluateProjects: async () => ({
        format: 'markdown' as const,
        content: '# Stub 评估',
        generatedAt: new Date().toISOString(),
        usedExternalAi: false
      }),
      getAiConfig: async () => null,
      saveAiConfig: async (input) => {
        const key = input.apiKey?.trim() ?? ''
        if (!key) throw stubError('err.apiKeyRequired')
        return {
          provider: input.provider,
          baseUrl: input.baseUrl,
          model: input.model,
          enabled: input.enabled,
          dataPolicy: 'desensitized-only' as const,
          hasApiKey: true
        }
      }
    },
    search: {
      query: async (query) => {
        const q = query.trim()
        const lower = q.toLowerCase()
        if (!lower) return { query: q, hits: [] }
        const groupNames: Record<string, string> = {
          'demo-project': stubT('demo.groupProject'),
          'demo-function': stubT('demo.groupFunction'),
          'demo-anonymous': stubT('demo.groupAnonymous')
        }
        const hits: import('@shared/search/types').GlobalSearchHit[] = []
        for (const [groupId, tasks] of Object.entries(readAllTasks())) {
          for (const t of tasks) {
            if (t.title.toLowerCase().includes(lower)) {
              hits.push({
                kind: 'task',
                groupId,
                taskId: t.taskId,
                title: t.title,
                groupName: groupNames[groupId] ?? groupId
              })
            }
          }
        }
        try {
          const raw = localStorage.getItem(CHAT_STORAGE_KEY)
          const store = raw ? (JSON.parse(raw) as Record<string, import('@shared/chat/types').ChatMessage[]>) : {}
          for (const [groupId, msgs] of Object.entries(store)) {
            for (const m of msgs) {
              const text =
                m.content.kind === 'text'
                  ? m.content.text
                  : m.content.kind === 'code'
                    ? m.content.code
                    : m.content.kind === 'task_ref'
                      ? m.content.title
                      : ''
              if (!text.toLowerCase().includes(lower)) continue
              hits.push({
                kind: 'message',
                groupId,
                msgId: m.msgId,
                snippet: text.slice(0, 60),
                groupName: groupNames[groupId] ?? groupId
              })
            }
          }
        } catch {
          /* ignore */
        }
        const groupIds = ['demo-project', 'demo-function', 'demo-anonymous']
        const seenMembers = new Set<string>()
        for (const groupId of groupIds) {
          for (const member of listStubMembers(groupId)) {
            const key = `${groupId}:${member.userId}`
            if (seenMembers.has(key)) continue
            const nameMatch = member.displayName.toLowerCase().includes(lower)
            const mentionMatch = member.mentionKeys?.some((k) => k.toLowerCase().includes(lower))
            if (!nameMatch && !mentionMatch) continue
            seenMembers.add(key)
            hits.push({
              kind: 'member',
              groupId,
              userId: member.userId,
              displayName: member.displayName,
              groupName: groupNames[groupId] ?? groupId
            })
          }
        }
        return { query: q, hits: hits.slice(0, 16) }
      }
    },
    network: {
      getStatus: async () => ({
        mode: 'stub' as const,
        linkState: 'stub' as const,
        peerCount: 0,
        localIp: null
      }),
      reconnect: async () => ({
        mode: 'stub' as const,
        linkState: 'stub' as const,
        peerCount: 0,
        localIp: null
      }),
      connectManualPeer: async (address) => {
        parseHostPort(address)
        throw stubError('stub.manualPeerPreviewOnly')
      }
    },
    badge: {
      getGroupTabBadges: async (groupId) => stubGroupTabBadges(groupId)
    },
    discover: {
      snapshot: async () => {
        const status = readStatus()
        const localUserId = status.configured && status.user ? status.user.userId : undefined
        const peers = listStubMembers('demo-project')
          .filter((m) => m.userId !== localUserId)
          .map((m) => ({
            userId: m.userId,
            displayName: m.displayName,
            deviceCount: 1,
            online: true
          }))
        return {
          peers,
          groups: [
            {
              groupId: 'stub-remote-project',
              name: 'LanPM 协作组',
              type: 'project' as const,
              ownerUserId: 'demo-alice',
              ownerDisplayName: 'Alice',
              joined: false
            }
          ]
        }
      }
    },
    data: {
      getStorageSettings: async () => ({
        localRetentionDays: 90,
        syncWindowDays: 7,
        messageCount: 0
      }),
      getStorageUsage: async () => ({ messageCount: 0, fileCount: 0 }),
      setLocalRetentionDays: async (days) => days,
      runCleanup: async () => ({
        messagesDeleted: 0,
        receiptsDeleted: 0,
        transfersDeleted: 0,
        tasksDeleted: 0
      }),
      clearGroupMessages: async (groupId) => {
        const before = readChatMessages(groupId).length
        writeChatMessages(groupId, [])
        return before
      },
      listDmGroupIds: async () => {
        try {
          const raw = localStorage.getItem(CHAT_STORAGE_KEY)
          if (!raw) return []
          const store = JSON.parse(raw) as Record<string, ChatMessage[]>
          return Object.keys(store).filter((id) => isDmGroupId(id))
        } catch {
          return []
        }
      },
      exportGroupBundle: async () => null,
      importGroupBundle: async () => {
        throw stubError('stub.importBundleElectronOnly')
      }
    }
  }
}
