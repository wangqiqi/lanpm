import { randomUUID } from 'crypto'
import type { Database } from 'better-sqlite3'
import type { ChatMessage } from '../../shared/chat/types'
import { TASK_PUSH_CHANNEL } from '../../shared/task/channels'
import { applyAggregatedProgress } from '../../shared/task/progress'
import type { CreateTaskInput, GanttScheduleInput, MoveTaskInput, Task, UpdateTaskInput } from '../../shared/task/types'
import type { TaskDependency, UpsertDependencyInput } from '../../shared/task/dependency'
import { throwLanpm } from '../../shared/errors/lanpmError'
import {
  clampProgressPercent,
  normalizeTaskTitle,
  validateOtherReason,
  validateTaskDateRange,
  validateTaskTitle
} from '../../shared/task/validation'
import { assertGroupAllowsTasks } from '../../shared/group/guards'
import { resolveGroupType } from '../group/groupService'
import { getSetupStatus } from '../identity/setup'
import {
  buildTaskFromInput,
  getMaxSortOrderInColumn,
  getTaskById,
  insertTask,
  listTasksByGroup,
  clearTaskDependencies,
  listActiveChildTasks,
  promoteChildrenToRoot,
  softDeleteTask,
  updateTaskRow
} from '../storage/repositories/taskRepository'
import {
  listDependenciesByGroup,
  removeDependency,
  upsertDependency
} from '../storage/repositories/taskDependencyRepository'
import { publishChatMessage, sendTaskRefMessage } from '../chat/chatService'
import { broadcastMessage } from '../chat/chatBroadcast'
import { replaceAnonymousMessage } from '../chat/anonymousChatStore'
import { toRecalledMessage } from '../../shared/chat/recall'
import type { DeleteTaskMode } from '../../shared/task/deleteMode'
import { shouldCompensateCreateTaskFromChat } from '../../shared/task/createFromChatCompensation'
import { publishTaskDelete, publishTaskDepDelete, publishTaskDepUpsert, publishTaskUpsert } from './taskSyncService'
import { broadcastToAllWindows } from '../utils/broadcast'
import { updateMessage } from '../storage/repositories/messageRepository'
import { isAnonymousGroupType } from '../../shared/group/guards'

function assertTaskWritable(db: Database, groupId: string): void {
  if (groupId.startsWith('dm:')) throwLanpm('stub.dmNoTask')
  assertGroupAllowsTasks(resolveGroupType(db, groupId))
}

function broadcastTasksChanged(groupId: string): void {
  broadcastToAllWindows(TASK_PUSH_CHANNEL, groupId)
}

export function listGroupTasks(db: Database, groupId: string): Task[] {
  const raw = listTasksByGroup(db, groupId)
  const deps = listDependenciesByGroup(db, groupId)
  const depsByTarget = new Map<string, TaskDependency[]>()
  for (const dep of deps) {
    const list = depsByTarget.get(dep.toTaskId) ?? []
    list.push(dep)
    depsByTarget.set(dep.toTaskId, list)
  }
  const enriched = raw.map((t) => ({
    ...t,
    dependencies: depsByTarget.get(t.taskId) ?? []
  }))
  return applyAggregatedProgress(enriched)
}

export function createGroupTask(db: Database, input: CreateTaskInput): Task {
  assertTaskWritable(db, input.groupId)
  const status = getSetupStatus(db)
  if (!status.configured || !status.user) {
    throwLanpm('stub.identityRequired')
  }
  const titleErr = validateTaskTitle(input.title)
  if (titleErr) throwLanpm(titleErr)

  const taskId = `task_${randomUUID()}`
  const task = buildTaskFromInput(
    { ...input, title: normalizeTaskTitle(input.title) },
    status.user.userId,
    taskId
  )
  task.sortOrder = getMaxSortOrderInColumn(db, input.groupId, task.status) + 1

  const reasonErr = validateOtherReason(task.status, task.otherReason)
  if (reasonErr) throwLanpm(reasonErr)

  insertTask(db, task)
  publishTaskUpsert(db, task)
  broadcastTasksChanged(input.groupId)
  return getTaskById(db, taskId)!
}

export function updateGroupTask(db: Database, input: UpdateTaskInput): Task {
  const existing = getTaskById(db, input.taskId)
  if (!existing) throwLanpm('stub.taskNotFound')
  assertTaskWritable(db, existing.groupId)

  const nextStatus = input.status ?? existing.status
  const nextReason =
    input.otherReason !== undefined
      ? input.otherReason ?? undefined
      : input.status !== undefined && input.status !== 'other'
        ? undefined
        : existing.otherReason

  const reasonErr = validateOtherReason(nextStatus, nextReason)
  if (reasonErr) throwLanpm(reasonErr)

  if (input.title !== undefined) {
    const titleErr = validateTaskTitle(input.title)
    if (titleErr) throwLanpm(titleErr)
  }

  const nextStart =
    input.startDate !== undefined ? input.startDate : existing.startDate ?? null
  const nextEnd = input.endDate !== undefined ? input.endDate : existing.endDate ?? null
  const dateErr = validateTaskDateRange(nextStart, nextEnd)
  if (dateErr) throwLanpm(dateErr)

  const patch: UpdateTaskInput = {
    ...input,
    ...(input.title !== undefined ? { title: normalizeTaskTitle(input.title) } : {}),
    ...(input.progressPercent !== undefined
      ? { progressPercent: clampProgressPercent(input.progressPercent) }
      : {})
  }

  const updated = updateTaskRow(db, patch)
  if (!updated) throwLanpm('err.taskUpdateFailed')
  publishTaskUpsert(db, updated)
  broadcastTasksChanged(existing.groupId)
  return listGroupTasks(db, existing.groupId).find((t) => t.taskId === updated.taskId) ?? updated
}

export function moveGroupTask(db: Database, input: MoveTaskInput): Task {
  const existing = getTaskById(db, input.taskId)
  if (!existing) throwLanpm('stub.taskNotFound')
  assertTaskWritable(db, existing.groupId)

  const reasonErr = validateOtherReason(input.status, input.otherReason ?? existing.otherReason)
  if (reasonErr) throwLanpm(reasonErr)

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
  let message: ChatMessage | undefined
  try {
    message = await publishChatMessage(db, groupId, 'task_ref', {
      kind: 'task_ref',
      taskId: task.taskId,
      title: task.title
    })
  } catch (err) {
    compensateCreateTaskFromChat(db, task, undefined)
    throw err
  }
  if (
    shouldCompensateCreateTaskFromChat({
      kind: 'message',
      deliveryStatus: message.deliveryStatus
    })
  ) {
    compensateCreateTaskFromChat(db, task, message)
    throwLanpm('err.chatTaskCreateFailed')
  }
  return { task, message }
}

function compensateCreateTaskFromChat(
  db: Database,
  task: Task,
  message: ChatMessage | undefined
): void {
  const now = new Date().toISOString()
  softDeleteTask(db, task.taskId)
  publishTaskDelete(db, { ...task, deletedAt: now, updatedAt: now })
  broadcastTasksChanged(task.groupId)

  if (!message) return
  const status = getSetupStatus(db)
  const recalledBy = status.user?.userId ?? message.senderUserId
  const recalled = toRecalledMessage(message, recalledBy, now)
  if (isAnonymousGroupType(resolveGroupType(db, task.groupId))) {
    replaceAnonymousMessage(task.groupId, recalled)
  } else {
    updateMessage(db, recalled)
  }
  broadcastMessage(recalled)
}


export async function referenceTaskFromChat(
  db: Database,
  groupId: string,
  taskId: string
): Promise<{ task: Task; message: ChatMessage }> {
  const message = await sendTaskRefMessage(db, groupId, taskId)
  const task = getTaskById(db, taskId)
  if (!task) throwLanpm('stub.taskNotFound')
  return { task, message }
}

export function updateTaskSchedule(db: Database, input: GanttScheduleInput): Task {
  const existing = getTaskById(db, input.taskId)
  if (!existing) throwLanpm('stub.taskNotFound')
  assertTaskWritable(db, existing.groupId)
  return updateGroupTask(db, {
    taskId: input.taskId,
    startDate: input.startDate,
    endDate: input.endDate
  })
}

export function upsertTaskDependency(db: Database, input: UpsertDependencyInput): TaskDependency {
  assertTaskWritable(db, input.groupId)
  const from = getTaskById(db, input.fromTaskId)
  const to = getTaskById(db, input.toTaskId)
  if (!from || !to || from.groupId !== input.groupId || to.groupId !== input.groupId) {
    throwLanpm('err.dependencyInvalid')
  }
  const dep = upsertDependency(db, input)
  publishTaskDepUpsert(db, input.groupId, dep)
  broadcastTasksChanged(input.groupId)
  return dep
}

function deleteTaskRecursive(db: Database, task: Task, mode: DeleteTaskMode): void {
  const children = listActiveChildTasks(db, task.groupId, task.taskId)
  if (mode === 'cascade') {
    for (const child of children) {
      deleteTaskRecursive(db, child, mode)
    }
  } else {
    const promoted = promoteChildrenToRoot(db, task.groupId, task.taskId)
    for (const child of promoted) {
      publishTaskUpsert(db, child)
    }
  }
  clearTaskDependencies(db, task.taskId)
  if (softDeleteTask(db, task.taskId)) {
    publishTaskDelete(db, task)
  }
}

export function deleteGroupTask(
  db: Database,
  taskId: string,
  mode: DeleteTaskMode = 'promote'
): boolean {
  const existing = getTaskById(db, taskId)
  if (!existing) return false
  assertTaskWritable(db, existing.groupId)
  deleteTaskRecursive(db, existing, mode)
  broadcastTasksChanged(existing.groupId)
  return true
}

export function deleteTaskDependency(
  db: Database,
  groupId: string,
  fromTaskId: string,
  toTaskId: string
): boolean {
  assertTaskWritable(db, groupId)
  const removed = removeDependency(db, fromTaskId, toTaskId)
  if (removed) {
    publishTaskDepDelete(db, groupId, removed)
    broadcastTasksChanged(groupId)
    return true
  }
  return false
}
