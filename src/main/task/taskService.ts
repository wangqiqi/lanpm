import { randomUUID } from 'crypto'
import { BrowserWindow } from 'electron'
import type { Database } from 'better-sqlite3'
import type { ChatMessage } from '../../shared/chat/types'
import { TASK_PUSH_CHANNEL } from '../../shared/task/channels'
import { applyAggregatedProgress } from '../../shared/task/progress'
import type { CreateTaskInput, MoveTaskInput, Task, UpdateTaskInput } from '../../shared/task/types'
import { validateOtherReason } from '../../shared/task/validation'
import { getSetupStatus } from '../identity/setup'
import {
  buildTaskFromInput,
  getMaxSortOrderInColumn,
  getTaskById,
  insertTask,
  listTasksByGroup,
  updateTaskRow
} from '../storage/repositories/taskRepository'
import { publishChatMessage } from '../chat/chatService'

function assertTaskWritable(groupId: string): void {
  if (groupId.startsWith('dm:')) throw new Error('私聊不支持任务')
  if (groupId === 'demo-anonymous') throw new Error('匿名群不支持任务')
  if (groupId === 'demo-function') throw new Error('职能群不支持看板任务')
}

function broadcastTasksChanged(groupId: string): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(TASK_PUSH_CHANNEL, groupId)
  }
}

export function listGroupTasks(db: Database, groupId: string): Task[] {
  const raw = listTasksByGroup(db, groupId)
  return applyAggregatedProgress(raw)
}

export function createGroupTask(db: Database, input: CreateTaskInput): Task {
  assertTaskWritable(input.groupId)
  const status = getSetupStatus(db)
  if (!status.configured || !status.user) {
    throw new Error('请先完成身份配置')
  }
  const title = input.title.trim()
  if (!title) throw new Error('任务标题不能为空')

  const taskId = `task_${randomUUID()}`
  const task = buildTaskFromInput(input, status.user.userId, taskId)
  task.sortOrder = getMaxSortOrderInColumn(db, input.groupId, task.status) + 1

  const reasonErr = validateOtherReason(task.status, task.otherReason)
  if (reasonErr) throw new Error(reasonErr)

  insertTask(db, task)
  broadcastTasksChanged(input.groupId)
  return getTaskById(db, taskId)!
}

export function updateGroupTask(db: Database, input: UpdateTaskInput): Task {
  const existing = getTaskById(db, input.taskId)
  if (!existing) throw new Error('任务不存在')
  assertTaskWritable(existing.groupId)

  const nextStatus = input.status ?? existing.status
  const nextReason =
    input.otherReason !== undefined
      ? input.otherReason ?? undefined
      : input.status !== undefined && input.status !== 'other'
        ? undefined
        : existing.otherReason

  const reasonErr = validateOtherReason(nextStatus, nextReason)
  if (reasonErr) throw new Error(reasonErr)

  const updated = updateTaskRow(db, input)
  if (!updated) throw new Error('任务更新失败')
  broadcastTasksChanged(existing.groupId)
  return listGroupTasks(db, existing.groupId).find((t) => t.taskId === updated.taskId) ?? updated
}

export function moveGroupTask(db: Database, input: MoveTaskInput): Task {
  const existing = getTaskById(db, input.taskId)
  if (!existing) throw new Error('任务不存在')
  assertTaskWritable(existing.groupId)

  const reasonErr = validateOtherReason(input.status, input.otherReason ?? existing.otherReason)
  if (reasonErr) throw new Error(reasonErr)

  const sortOrder =
    input.sortOrder ??
    (input.status !== existing.status
      ? getMaxSortOrderInColumn(db, existing.groupId, input.status) + 1
      : existing.sortOrder)

  const patch: UpdateTaskInput = {
    taskId: input.taskId,
    status: input.status,
    sortOrder,
    otherReason: input.status === 'other' ? (input.otherReason ?? existing.otherReason) : null
  }

  return updateGroupTask(db, patch)
}

export async function createTaskFromChat(
  db: Database,
  groupId: string,
  title: string
): Promise<{ task: Task; message: ChatMessage }> {
  const task = createGroupTask(db, { groupId, title, status: 'todo' })
  const message = await publishChatMessage(db, groupId, 'task_ref', {
    kind: 'task_ref',
    taskId: task.taskId,
    title: task.title
  })
  return { task, message }
}
