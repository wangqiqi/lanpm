import type { Database } from 'better-sqlite3'
import type { CreateTaskInput, Task, TaskPriority, TaskStatus, UpdateTaskInput } from '../../../shared/task/types'
import { filterTagsToGroupDict, normalizeTaskTags } from '../../../shared/task/tags.ts'
import { normalizeLinkedFileIds } from '../../../shared/task/linkedFiles.ts'
import { listGroupTagMeta } from './groupTagMetaRepository.ts'
import { clampProgressPercent } from '../../../shared/task/validation.ts'
import { parseStoryPoints, resolveStoryPointsPatch } from '../../../shared/task/storyPoints.ts'
import { lwwShouldApply } from '../../../shared/sync/lww.ts'
import { getMeta } from './syncMetaRepository.ts'

interface TaskRow {
  task_id: string
  group_id: string
  parent_task_id: string | null
  title: string
  description: string | null
  status: string
  other_reason: string | null
  priority: string
  assignee_user_id: string | null
  tags_json?: string | null
  source_msg_id?: string | null
  linked_file_ids_json?: string | null
  progress_percent: number
  story_points?: number | null
  start_date: string | null
  end_date: string | null
  milestone: number
  sort_order: number
  created_by: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  last_writer_device_id: string
}

function localWriterDeviceId(db: Database): string {
  return getMeta(db, 'local_device_id') ?? ''
}

function parseTagsJson(raw: string | null | undefined): string[] | undefined {
  if (raw == null || raw === '' || raw === '[]') return undefined
  try {
    const parsed: unknown = JSON.parse(raw)
    const tags = normalizeTaskTags(parsed)
    return tags.length > 0 ? tags : undefined
  } catch {
    return undefined
  }
}

function tagsToJson(tags: string[] | undefined): string {
  const normalized = normalizeTaskTags(tags ?? [])
  return JSON.stringify(normalized)
}

function parseLinkedFileIdsJson(raw: string | null | undefined): string[] | undefined {
  if (raw == null || raw === '' || raw === '[]') return undefined
  try {
    const ids = normalizeLinkedFileIds(JSON.parse(raw) as unknown)
    return ids.length > 0 ? ids : undefined
  } catch {
    return undefined
  }
}

function linkedFileIdsToJson(ids: string[] | undefined): string {
  return JSON.stringify(normalizeLinkedFileIds(ids ?? []))
}

/** Persist only dictionary tags (empty dict → []). */
function coerceTagsForGroup(
  db: Database,
  groupId: string,
  tags: string[] | undefined
): string[] | undefined {
  const filtered = filterTagsToGroupDict(tags ?? [], listGroupTagMeta(db, groupId))
  return filtered.length > 0 ? filtered : undefined
}

function rowToTask(row: TaskRow): Task {
  return {
    taskId: row.task_id,
    groupId: row.group_id,
    parentTaskId: row.parent_task_id ?? undefined,
    title: row.title,
    description: row.description ?? undefined,
    status: row.status as TaskStatus,
    otherReason: row.other_reason ?? undefined,
    priority: row.priority as TaskPriority,
    assigneeUserId: row.assignee_user_id ?? undefined,
    tags: parseTagsJson(row.tags_json),
    sourceMsgId: row.source_msg_id ?? undefined,
    linkedFileIds: parseLinkedFileIdsJson(row.linked_file_ids_json),
    progressPercent: clampProgressPercent(row.progress_percent),
    storyPoints: parseStoryPoints(row.story_points),
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
    milestone: row.milestone === 1,
    sortOrder: row.sort_order,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? undefined
  }
}

export function listTasksByGroup(db: Database, groupId: string): Task[] {
  const rows = db
    .prepare(
      `SELECT * FROM tasks
       WHERE group_id = ? AND deleted_at IS NULL
       ORDER BY sort_order ASC, created_at ASC`
    )
    .all(groupId) as TaskRow[]
  return rows.map(rowToTask)
}

export type TaskWithAssigneeMeta = Task & {
  assigneeDisplayName?: string
  assigneeDepartment?: string
}

/** All non-deleted tasks in project groups, with assignee name/dept in one JOIN. */
export function listProjectTasksWithAssigneeMeta(db: Database): TaskWithAssigneeMeta[] {
  const rows = db
    .prepare(
      `SELECT t.*, u.display_name AS assignee_display_name, u.department AS assignee_department
       FROM tasks t
       INNER JOIN groups g ON g.group_id = t.group_id AND g.type = 'project'
       LEFT JOIN users u ON u.user_id = t.assignee_user_id
       WHERE t.deleted_at IS NULL
       ORDER BY t.sort_order ASC, t.created_at ASC`
    )
    .all() as Array<TaskRow & { assignee_display_name: string | null; assignee_department: string | null }>
  return rows.map((row) => ({
    ...rowToTask(row),
    assigneeDisplayName: row.assignee_display_name ?? undefined,
    assigneeDepartment: row.assignee_department?.trim() || undefined
  }))
}

/** All tasks in group including soft-deleted (Y.Doc seed / CRDT). */
export function listTasksByGroupIncludingDeleted(db: Database, groupId: string): Task[] {
  const rows = db
    .prepare(
      `SELECT * FROM tasks
       WHERE group_id = ?
       ORDER BY sort_order ASC, created_at ASC`
    )
    .all(groupId) as TaskRow[]
  return rows.map(rowToTask)
}

/** Max updated_at in group (including soft-deleted); empty when none. */
export function getMaxTaskUpdatedAt(db: Database, groupId: string): string {
  const row = db
    .prepare(`SELECT MAX(updated_at) AS max_ts FROM tasks WHERE group_id = ?`)
    .get(groupId) as { max_ts: string | null } | undefined
  return row?.max_ts ?? ''
}

/**
 * Offline pull: tasks with updated_at > sinceUpdatedAt and >= minUpdatedAt
 * (includes soft-deleted). Ordered ASC for pagination cursor.
 */
export function listTasksSince(
  db: Database,
  groupId: string,
  sinceUpdatedAt: string,
  minUpdatedAt: string,
  limit = 100
): Task[] {
  const rows = db
    .prepare(
      `SELECT * FROM tasks
       WHERE group_id = ?
         AND updated_at > ?
         AND updated_at >= ?
       ORDER BY updated_at ASC, task_id ASC
       LIMIT ?`
    )
    .all(groupId, sinceUpdatedAt, minUpdatedAt, limit) as TaskRow[]
  return rows.map(rowToTask)
}

export function getTaskById(db: Database, taskId: string): Task | null {
  const row = db
    .prepare(`SELECT * FROM tasks WHERE task_id = ? AND deleted_at IS NULL`)
    .get(taskId) as TaskRow | undefined
  return row ? rowToTask(row) : null
}

export function getMaxSortOrderInColumn(
  db: Database,
  groupId: string,
  status: TaskStatus
): number {
  const row = db
    .prepare(
      `SELECT COALESCE(MAX(sort_order), -1) AS max_order
       FROM tasks
       WHERE group_id = ? AND status = ? AND deleted_at IS NULL`
    )
    .get(groupId, status) as { max_order: number }
  return row.max_order
}

export function insertTask(db: Database, task: Task, writerDeviceId?: string): void {
  const writer = writerDeviceId ?? localWriterDeviceId(db)
  const linked = normalizeLinkedFileIds(task.linkedFileIds ?? [])
  db.prepare(
    `INSERT INTO tasks (
      task_id, group_id, parent_task_id, title, description,
      status, other_reason, priority, assignee_user_id, tags_json,
      source_msg_id, linked_file_ids_json,
      progress_percent, story_points, start_date, end_date, milestone, sort_order,
      created_by, created_at, updated_at, deleted_at, last_writer_device_id
    ) VALUES (
      @taskId, @groupId, @parentTaskId, @title, @description,
      @status, @otherReason, @priority, @assigneeUserId, @tagsJson,
      @sourceMsgId, @linkedFileIdsJson,
      @progressPercent, @storyPoints, @startDate, @endDate, @milestone, @sortOrder,
      @createdBy, @createdAt, @updatedAt, @deletedAt, @lastWriterDeviceId
    )`
  ).run({
    taskId: task.taskId,
    groupId: task.groupId,
    parentTaskId: task.parentTaskId ?? null,
    title: task.title,
    description: task.description ?? null,
    status: task.status,
    otherReason: task.otherReason ?? null,
    priority: task.priority,
    assigneeUserId: task.assigneeUserId ?? null,
    tagsJson: tagsToJson(coerceTagsForGroup(db, task.groupId, task.tags)),
    sourceMsgId: task.sourceMsgId ?? null,
    linkedFileIdsJson: linkedFileIdsToJson(linked.length > 0 ? linked : undefined),
    progressPercent: clampProgressPercent(task.progressPercent),
    storyPoints: parseStoryPoints(task.storyPoints) ?? null,
    startDate: task.startDate ?? null,
    endDate: task.endDate ?? null,
    milestone: task.milestone ? 1 : 0,
    sortOrder: task.sortOrder,
    createdBy: task.createdBy,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    deletedAt: task.deletedAt ?? null,
    lastWriterDeviceId: writer
  })
}

export function updateTaskRow(db: Database, input: UpdateTaskInput): Task | null {
  const existing = getTaskById(db, input.taskId)
  if (!existing) return null

  const linkedNext =
    input.linkedFileIds !== undefined
      ? normalizeLinkedFileIds(input.linkedFileIds)
      : undefined

  const next: Task = {
    ...existing,
    title: input.title ?? existing.title,
    description: input.description !== undefined ? input.description : existing.description,
    status: input.status ?? existing.status,
    priority: input.priority ?? existing.priority,
    assigneeUserId:
      input.assigneeUserId === null
        ? undefined
        : input.assigneeUserId !== undefined
          ? input.assigneeUserId
          : existing.assigneeUserId,
    tags:
      input.tags !== undefined
        ? coerceTagsForGroup(db, existing.groupId, input.tags)
        : existing.tags,
    sourceMsgId:
      input.sourceMsgId === null
        ? undefined
        : input.sourceMsgId !== undefined
          ? input.sourceMsgId
          : existing.sourceMsgId,
    linkedFileIds:
      linkedNext !== undefined
        ? linkedNext.length > 0
          ? linkedNext
          : undefined
        : existing.linkedFileIds,
    progressPercent:
      input.progressPercent !== undefined
        ? clampProgressPercent(input.progressPercent)
        : existing.progressPercent,
    storyPoints: resolveStoryPointsPatch(input.storyPoints, existing.storyPoints),
    parentTaskId:
      input.parentTaskId === null
        ? undefined
        : input.parentTaskId !== undefined
          ? input.parentTaskId
          : existing.parentTaskId,
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

  if (input.otherReason === null) {
    next.otherReason = undefined
  } else if (input.otherReason !== undefined) {
    next.otherReason = input.otherReason
  } else if (input.status && input.status !== 'other') {
    next.otherReason = undefined
  } else {
    next.otherReason = existing.otherReason
  }

  db.prepare(
    `UPDATE tasks SET
      title = @title,
      description = @description,
      status = @status,
      other_reason = @otherReason,
      priority = @priority,
      assignee_user_id = @assigneeUserId,
      tags_json = @tagsJson,
      source_msg_id = @sourceMsgId,
      linked_file_ids_json = @linkedFileIdsJson,
      progress_percent = @progressPercent,
      story_points = @storyPoints,
      parent_task_id = @parentTaskId,
      sort_order = @sortOrder,
      start_date = @startDate,
      end_date = @endDate,
      milestone = @milestone,
      updated_at = @updatedAt,
      last_writer_device_id = @lastWriterDeviceId
     WHERE task_id = @taskId`
  ).run({
    taskId: next.taskId,
    title: next.title,
    description: next.description ?? null,
    status: next.status,
    otherReason: next.otherReason ?? null,
    priority: next.priority,
    assigneeUserId: next.assigneeUserId ?? null,
    tagsJson: tagsToJson(next.tags),
    sourceMsgId: next.sourceMsgId ?? null,
    linkedFileIdsJson: linkedFileIdsToJson(next.linkedFileIds),
    progressPercent: next.progressPercent,
    storyPoints: next.storyPoints ?? null,
    parentTaskId: next.parentTaskId ?? null,
    sortOrder: next.sortOrder,
    startDate: next.startDate ?? null,
    endDate: next.endDate ?? null,
    milestone: next.milestone ? 1 : 0,
    updatedAt: next.updatedAt,
    lastWriterDeviceId: localWriterDeviceId(db)
  })

  return next
}

export function listActiveChildTasks(
  db: Database,
  groupId: string,
  parentTaskId: string
): Task[] {
  const rows = db
    .prepare(
      `SELECT * FROM tasks
       WHERE group_id = ? AND parent_task_id = ? AND deleted_at IS NULL`
    )
    .all(groupId, parentTaskId) as TaskRow[]
  return rows.map(rowToTask)
}

export function promoteChildrenToRoot(db: Database, groupId: string, parentTaskId: string): Task[] {
  const children = listActiveChildTasks(db, groupId, parentTaskId)
  if (children.length === 0) return []
  const now = new Date().toISOString()
  const writer = localWriterDeviceId(db)
  db.prepare(
    `UPDATE tasks SET parent_task_id = NULL, updated_at = ?, last_writer_device_id = ?
     WHERE group_id = ? AND parent_task_id = ? AND deleted_at IS NULL`
  ).run(now, writer, groupId, parentTaskId)
  return children.map((c) => ({ ...c, parentTaskId: undefined, updatedAt: now }))
}

export function clearTaskDependencies(db: Database, taskId: string): void {
  db.prepare(`DELETE FROM task_dependencies WHERE from_task_id = ? OR to_task_id = ?`).run(
    taskId,
    taskId
  )
}

export function softDeleteTask(db: Database, taskId: string): boolean {
  const now = new Date().toISOString()
  const result = db
    .prepare(
      `UPDATE tasks SET deleted_at = ?, updated_at = ?, last_writer_device_id = ?
       WHERE task_id = ? AND deleted_at IS NULL`
    )
    .run(now, now, localWriterDeviceId(db), taskId)
  return result.changes > 0
}

function getTaskRowById(db: Database, taskId: string): TaskRow | null {
  const row = db.prepare(`SELECT * FROM tasks WHERE task_id = ?`).get(taskId) as TaskRow | undefined
  return row ?? null
}

/** B-01 — 远端 task_patch LWW 合并（平局用 senderDeviceId） */
export function upsertTaskFromRemote(db: Database, task: Task, remoteDeviceId: string): boolean {
  const existing = getTaskRowById(db, task.taskId)
  if (
    existing &&
    !lwwShouldApply(
      task.updatedAt,
      existing.updated_at,
      remoteDeviceId,
      existing.last_writer_device_id
    )
  ) {
    return false
  }
  if (existing) {
    db.prepare(`DELETE FROM tasks WHERE task_id = ?`).run(task.taskId)
  }
  insertTask(db, task, remoteDeviceId)
  return true
}

export function applyRemoteTaskDelete(db: Database, task: Task, remoteDeviceId: string): boolean {
  const existing = getTaskRowById(db, task.taskId)
  if (existing?.deleted_at) return false
  if (
    existing &&
    !lwwShouldApply(
      task.updatedAt,
      existing.updated_at,
      remoteDeviceId,
      existing.last_writer_device_id
    )
  ) {
    return false
  }
  if (!existing) {
    insertTask(db, { ...task, deletedAt: task.deletedAt ?? task.updatedAt }, remoteDeviceId)
    return true
  }
  const now = task.updatedAt
  db.prepare(
    `UPDATE tasks SET deleted_at = ?, updated_at = ?, last_writer_device_id = ?
     WHERE task_id = ? AND deleted_at IS NULL`
  ).run(now, now, remoteDeviceId, task.taskId)
  return true
}

export function buildTaskFromInput(
  input: CreateTaskInput,
  createdBy: string,
  taskId: string
): Task {
  const now = new Date().toISOString()
  const tags = normalizeTaskTags(input.tags ?? [])
  const linked = normalizeLinkedFileIds(input.linkedFileIds ?? [])
  const sourceMsgId = input.sourceMsgId?.trim() || undefined
  return {
    taskId,
    groupId: input.groupId,
    parentTaskId: input.parentTaskId,
    title: input.title.trim(),
    status: input.status ?? 'todo',
    priority: input.priority ?? 'medium',
    assigneeUserId: input.assigneeUserId,
    tags: tags.length > 0 ? tags : undefined,
    sourceMsgId,
    linkedFileIds: linked.length > 0 ? linked : undefined,
    progressPercent: clampProgressPercent(input.progressPercent ?? 0),
    sortOrder: 0,
    createdBy,
    createdAt: now,
    updatedAt: now
  }
}
