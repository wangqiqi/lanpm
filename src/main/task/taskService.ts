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
import { filterTagsToGroupDict } from '../../shared/task/tags'
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
import { listGroupTagMeta } from '../storage/repositories/groupTagMetaRepository'
import {
  listDependenciesByGroup,
  removeDependency,
  upsertDependency
} from '../storage/repositories/taskDependencyRepository'
import { publishChatMessage, sendTaskRefMessage } from '../chat/chatService'
import { broadcastMessage } from '../chat/chatBroadcast'
import { toRecalledMessage } from '../../shared/chat/recall'
import type { DeleteTaskMode } from '../../shared/task/deleteMode'
import { shouldCompensateCreateTaskFromChat } from '../../shared/task/createFromChatCompensation'
import { publishTaskDelete, publishTaskDepDelete, publishTaskDepUpsert, publishTaskUpsert } from './taskSyncService'
import { mirrorTaskToCrdt } from './taskCrdtService'
import { broadcastToAllWindows } from '../utils/broadcast'
import { updateMessage, listMessagesForTaskDiscussion } from '../storage/repositories/messageRepository'
import { collectTaskDiscussions, type TaskDiscussionItem } from '../../shared/task/discussions'
import type {
  ChecklistItem,
  ChecklistView,
  UpsertChecklistItemInput
} from '../../shared/task/checklist'
import { checklistProgressOf } from '../../shared/task/checklist'
import {
  getChecklistByTaskId,
  getChecklistItemById,
  listChecklistItemsByTaskId,
  setChecklistItemDone,
  softDeleteChecklistItem,
  upsertChecklistItemRow
} from '../storage/repositories/checklistRepository'

function assertTaskWritable(db: Database, groupId: string): void {
  if (groupId.startsWith('dm:')) throwLanpm('stub.dmNoTask')
  assertGroupAllowsTasks(resolveGroupType(db, groupId))
}

function broadcastTasksChanged(groupId: string): void {
  broadcastToAllWindows(TASK_PUSH_CHANNEL, groupId)
}

function dictFilteredTags(
  db: Database,
  groupId: string,
  tags: string[] | undefined | null
): string[] | undefined {
  const meta = listGroupTagMeta(db, groupId)
  const filtered = filterTagsToGroupDict(tags ?? [], meta)
  return filtered.length > 0 ? filtered : undefined
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

/** A2: task_ref + source message for task detail discussion panel. */
export function listTaskDiscussions(
  db: Database,
  groupId: string,
  taskId: string
): TaskDiscussionItem[] {
  assertTaskWritable(db, groupId)
  const task = getTaskById(db, taskId)
  if (!task || task.groupId !== groupId) throwLanpm('stub.taskNotFound')
  const messages = listMessagesForTaskDiscussion(db, groupId, taskId, task.sourceMsgId)
  return collectTaskDiscussions(messages, taskId, task.sourceMsgId)
}

/** P1-3: list checklist + progress for a task. */
export function listTaskChecklist(db: Database, groupId: string, taskId: string): ChecklistView {
  assertTaskWritable(db, groupId)
  const task = getTaskById(db, taskId)
  if (!task || task.groupId !== groupId) throwLanpm('stub.taskNotFound')
  const checklist = getChecklistByTaskId(db, taskId)
  const items = listChecklistItemsByTaskId(db, taskId)
  return {
    checklist,
    items,
    progress: checklistProgressOf(items)
  }
}

export function upsertTaskChecklistItem(
  db: Database,
  input: UpsertChecklistItemInput
): ChecklistItem {
  assertTaskWritable(db, input.groupId)
  const task = getTaskById(db, input.taskId)
  if (!task || task.groupId !== input.groupId) throwLanpm('stub.taskNotFound')
  const item = upsertChecklistItemRow(db, input)
  broadcastTasksChanged(input.groupId)
  return item
}

export function toggleTaskChecklistItem(
  db: Database,
  groupId: string,
  itemId: string,
  done?: boolean
): ChecklistItem {
  assertTaskWritable(db, groupId)
  const existing = getChecklistItemById(db, itemId)
  if (!existing) throwLanpm('stub.taskNotFound')
  const task = getTaskById(db, existing.taskId)
  if (!task || task.groupId !== groupId) throwLanpm('stub.taskNotFound')
  const next = done !== undefined ? done : !existing.done
  const updated = setChecklistItemDone(db, itemId, next)
  if (!updated) throwLanpm('stub.taskNotFound')
  broadcastTasksChanged(groupId)
  return updated
}

export function removeTaskChecklistItem(
  db: Database,
  groupId: string,
  itemId: string
): boolean {
  assertTaskWritable(db, groupId)
  const existing = getChecklistItemById(db, itemId)
  if (!existing) return false
  const task = getTaskById(db, existing.taskId)
  if (!task || task.groupId !== groupId) throwLanpm('stub.taskNotFound')
  const ok = softDeleteChecklistItem(db, itemId)
  if (ok) broadcastTasksChanged(groupId)
  return ok
}

/** P1-3: create child task from an incomplete checklist item. */
export function createSubtaskFromChecklistItem(
  db: Database,
  groupId: string,
  itemId: string
): { task: Task; item: ChecklistItem } {
  assertTaskWritable(db, groupId)
  const existing = getChecklistItemById(db, itemId)
  if (!existing) throwLanpm('stub.taskNotFound')
  const parent = getTaskById(db, existing.taskId)
  if (!parent || parent.groupId !== groupId) throwLanpm('stub.taskNotFound')
  if (existing.done) throwLanpm('stub.taskNotFound')
  if (existing.linkedSubtaskId) {
    const linked = getTaskById(db, existing.linkedSubtaskId)
    if (linked && !linked.deletedAt) {
      return { task: linked, item: existing }
    }
  }
  const child = createGroupTask(db, {
    groupId,
    title: existing.text,
    parentTaskId: parent.taskId,
    status: 'todo',
    priority: parent.priority
  })
  const item = upsertChecklistItemRow(db, {
    groupId,
    taskId: parent.taskId,
    itemId: existing.itemId,
    text: existing.text,
    done: existing.done,
    sortOrder: existing.sortOrder,
    linkedSubtaskId: child.taskId
  })
  broadcastTasksChanged(groupId)
  return { task: child, item }
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
  task.tags = dictFilteredTags(db, input.groupId, task.tags)
  task.sortOrder = getMaxSortOrderInColumn(db, input.groupId, task.status) + 1

  const reasonErr = validateOtherReason(task.status, task.otherReason)
  if (reasonErr) throwLanpm(reasonErr)

  insertTask(db, task)
  mirrorTaskToCrdt(db, task)
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
      : {}),
    ...(input.tags !== undefined
      ? { tags: dictFilteredTags(db, existing.groupId, input.tags) }
      : {})
  }

  const updated = updateTaskRow(db, patch)
  if (!updated) throwLanpm('err.taskUpdateFailed')
  mirrorTaskToCrdt(db, updated)
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
  title: string,
  options?: { sourceMsgId?: string; linkedFileIds?: string[] }
): Promise<{ task: Task; message: ChatMessage }> {
  const task = createGroupTask(db, {
    groupId,
    title,
    status: 'todo',
    sourceMsgId: options?.sourceMsgId,
    linkedFileIds: options?.linkedFileIds
  })
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
  const deleted = { ...task, deletedAt: now, updatedAt: now }
  mirrorTaskToCrdt(db, deleted)
  publishTaskDelete(db, deleted)
  broadcastTasksChanged(task.groupId)

  if (!message) return
  const status = getSetupStatus(db)
  const recalledBy = status.user?.userId ?? message.senderUserId
  const recalled = toRecalledMessage(message, recalledBy, now)
  updateMessage(db, recalled)
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
      mirrorTaskToCrdt(db, child)
      publishTaskUpsert(db, child)
    }
  }
  clearTaskDependencies(db, task.taskId)
  if (softDeleteTask(db, task.taskId)) {
    const now = new Date().toISOString()
    const deleted = { ...task, deletedAt: now, updatedAt: now }
    mirrorTaskToCrdt(db, deleted)
    publishTaskDelete(db, deleted)
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
