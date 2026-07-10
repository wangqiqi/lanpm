import type { Database } from 'better-sqlite3'
import type { CreateTaskInput, Task, TaskPriority, TaskStatus, UpdateTaskInput } from '../../../shared/task/types'
import { clampProgressPercent } from '../../../shared/task/validation.ts'

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
  progress_percent: number
  start_date: string | null
  end_date: string | null
  milestone: number
  sort_order: number
  created_by: string
  created_at: string
  updated_at: string
  deleted_at: string | null
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
    progressPercent: row.progress_percent,
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

export function insertTask(db: Database, task: Task): void {
  db.prepare(
    `INSERT INTO tasks (
      task_id, group_id, parent_task_id, title, description,
      status, other_reason, priority, assignee_user_id,
      progress_percent, start_date, end_date, milestone, sort_order,
      created_by, created_at, updated_at, deleted_at
    ) VALUES (
      @taskId, @groupId, @parentTaskId, @title, @description,
      @status, @otherReason, @priority, @assigneeUserId,
      @progressPercent, @startDate, @endDate, @milestone, @sortOrder,
      @createdBy, @createdAt, @updatedAt, @deletedAt
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
    progressPercent: task.progressPercent,
    startDate: task.startDate ?? null,
    endDate: task.endDate ?? null,
    milestone: task.milestone ? 1 : 0,
    sortOrder: task.sortOrder,
    createdBy: task.createdBy,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    deletedAt: task.deletedAt ?? null
  })
}

export function updateTaskRow(db: Database, input: UpdateTaskInput): Task | null {
  const existing = getTaskById(db, input.taskId)
  if (!existing) return null

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
    progressPercent:
      input.progressPercent !== undefined
        ? clampProgressPercent(input.progressPercent)
        : existing.progressPercent,
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
      progress_percent = @progressPercent,
      parent_task_id = @parentTaskId,
      sort_order = @sortOrder,
      start_date = @startDate,
      end_date = @endDate,
      milestone = @milestone,
      updated_at = @updatedAt
     WHERE task_id = @taskId`
  ).run({
    taskId: next.taskId,
    title: next.title,
    description: next.description ?? null,
    status: next.status,
    otherReason: next.otherReason ?? null,
    priority: next.priority,
    assigneeUserId: next.assigneeUserId ?? null,
    progressPercent: next.progressPercent,
    parentTaskId: next.parentTaskId ?? null,
    sortOrder: next.sortOrder,
    startDate: next.startDate ?? null,
    endDate: next.endDate ?? null,
    milestone: next.milestone ? 1 : 0,
    updatedAt: next.updatedAt
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
  db.prepare(
    `UPDATE tasks SET parent_task_id = NULL, updated_at = ?
     WHERE group_id = ? AND parent_task_id = ? AND deleted_at IS NULL`
  ).run(now, groupId, parentTaskId)
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
    .prepare(`UPDATE tasks SET deleted_at = ?, updated_at = ? WHERE task_id = ? AND deleted_at IS NULL`)
    .run(now, now, taskId)
  return result.changes > 0
}

function getTaskRowById(db: Database, taskId: string): Task | null {
  const row = db.prepare(`SELECT * FROM tasks WHERE task_id = ?`).get(taskId) as TaskRow | undefined
  return row ? rowToTask(row) : null
}

/** B-01 — 远端 task_patch LWW 合并 */
export function upsertTaskFromRemote(db: Database, task: Task): boolean {
  const existing = getTaskRowById(db, task.taskId)
  if (existing) {
    if (existing.updatedAt > task.updatedAt) return false
    if (existing.updatedAt === task.updatedAt) return false
    db.prepare(`DELETE FROM tasks WHERE task_id = ?`).run(task.taskId)
  }
  insertTask(db, task)
  return true
}

export function applyRemoteTaskDelete(db: Database, task: Task): boolean {
  const existing = getTaskRowById(db, task.taskId)
  if (existing?.deletedAt) return false
  if (existing && existing.updatedAt > task.updatedAt) return false
  if (!existing) {
    insertTask(db, { ...task, deletedAt: task.deletedAt ?? task.updatedAt })
    return true
  }
  return softDeleteTask(db, task.taskId)
}

export function buildTaskFromInput(
  input: CreateTaskInput,
  createdBy: string,
  taskId: string
): Task {
  const now = new Date().toISOString()
  return {
    taskId,
    groupId: input.groupId,
    parentTaskId: input.parentTaskId,
    title: input.title.trim(),
    status: input.status ?? 'todo',
    priority: input.priority ?? 'medium',
    assigneeUserId: input.assigneeUserId,
    progressPercent: input.progressPercent ?? 0,
    sortOrder: 0,
    createdBy,
    createdAt: now,
    updatedAt: now
  }
}
