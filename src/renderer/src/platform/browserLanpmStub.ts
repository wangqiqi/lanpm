import type { ChatMessage } from '@shared/chat/types'
import type { GroupMemberView } from '@shared/chat/members'
import { parseMentions } from '@shared/chat/mentions'
import { detectLanguage } from '@shared/chat/detectLanguage'
import { isDmGroupId, parseDmGroupId } from '@shared/chat/dmSession'
import type { UserPresence } from '@shared/network/types'
import type { SetupInput, SetupStatus } from '@shared/identity'
import { resolveDeviceName } from '@shared/identity/deviceName'

const BROWSER_PREVIEW_DEVICE = '开发预览'
import type { LanpmApi } from '@shared/lanpm-api'
import { isMessageReadByOthers } from '@shared/chat/readReceipt'
import type { CreateTaskInput, MoveTaskInput, Task, TaskStatus, UpdateTaskInput } from '@shared/task/types'
import { applyAggregatedProgress } from '@shared/task/progress'
import { validateOtherReason } from '@shared/task/validation'

const STORAGE_KEY = 'lanpm.dev.identity'
const CHAT_STORAGE_KEY = 'lanpm.dev.chat'
const TASK_STORAGE_KEY = 'lanpm.dev.tasks'
const READ_RECEIPT_KEY = 'lanpm.dev.readReceipts'

const taskListeners = new Set<(groupId: string) => void>()

function assertStubTaskWritable(groupId: string): void {
  if (groupId.startsWith('dm:')) throw new Error('私聊不支持任务')
  if (groupId === 'demo-anonymous') throw new Error('匿名群不支持任务')
  if (groupId === 'demo-function') throw new Error('职能群不支持看板任务')
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
  if (!status.configured || !status.user) throw new Error('请先完成身份配置')
  const title = input.title.trim()
  if (!title) throw new Error('任务标题不能为空')
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
    progressPercent: input.progressPercent ?? 0,
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
  if (!groupId) throw new Error('任务不存在')
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
  tasks[idx] = {
    ...existing,
    title: input.title ?? existing.title,
    status: nextStatus,
    otherReason: nextReason,
    priority: input.priority ?? existing.priority,
    assigneeUserId:
      input.assigneeUserId === null
        ? undefined
        : input.assigneeUserId ?? existing.assigneeUserId,
    progressPercent: input.progressPercent ?? existing.progressPercent,
    parentTaskId:
      input.parentTaskId === null
        ? undefined
        : input.parentTaskId ?? existing.parentTaskId,
    sortOrder: input.sortOrder ?? existing.sortOrder,
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
  { userId: 'demo-bob', displayName: 'Bob', mentionKeys: ['bob'] }
]

const STUB_PRESENCE: Record<string, UserPresence> = {
  'demo-alice': 'away',
  'demo-bob': 'offline'
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

/** 浏览器直连 Vite 时的身份 API 桩（无 Electron preload） */
function previewDeviceName(): string {
  return resolveDeviceName('', BROWSER_PREVIEW_DEVICE)
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
      }
    },
    chat: {
      listMessages: async (groupId) => {
        const status = readStatus()
        const localUserId = status.configured && status.user ? status.user.userId : undefined
        return applyReadStatus(readChatMessages(groupId), localUserId)
      },
      sendText: async (groupId, text) => {
        const status = readStatus()
        if (!status.configured || !status.user || !status.device) {
          throw new Error('请先完成身份配置')
        }
        const trimmed = text.trim()
        if (!trimmed) throw new Error('消息不能为空')
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
          throw new Error('请先完成身份配置')
        }
        const trimmed = code.trim()
        if (!trimmed) throw new Error('代码不能为空')
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
        throw new Error('任务不存在')
      },
      createFromChat: async (groupId, title) => {
        const task = stubCreateTask({ groupId, title, status: 'todo' })
        const status = readStatus()
        if (!status.configured || !status.user || !status.device) {
          throw new Error('请先完成身份配置')
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
      onTasksChanged: (handler) => {
        taskListeners.add(handler)
        return () => taskListeners.delete(handler)
      }
    }
  }
}
