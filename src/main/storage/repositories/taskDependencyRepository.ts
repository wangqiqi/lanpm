import type { Database } from 'better-sqlite3'
import { throwLanpm } from '../../../shared/errors/lanpmError.ts'
import type { TaskDependency, TaskDependencyType, UpsertDependencyInput } from '../../../shared/task/dependency.ts'
import type { TaskDepPatchPayload } from '../../../shared/task/sync.ts'

interface DepRow {
  from_task_id: string
  to_task_id: string
  dep_type: string
  updated_at: string
  deleted_at: string | null
}

export function listDependenciesByGroup(db: Database, groupId: string): TaskDependency[] {
  const rows = db
    .prepare(
      `SELECT d.from_task_id, d.to_task_id, d.dep_type, d.updated_at, d.deleted_at
       FROM task_dependencies d
       INNER JOIN tasks tf ON tf.task_id = d.from_task_id AND tf.group_id = ?
       INNER JOIN tasks tt ON tt.task_id = d.to_task_id AND tt.group_id = ?
       WHERE d.deleted_at IS NULL
         AND tf.deleted_at IS NULL AND tt.deleted_at IS NULL`
    )
    .all(groupId, groupId) as DepRow[]

  return rows.map((r) => ({
    fromTaskId: r.from_task_id,
    toTaskId: r.to_task_id,
    type: r.dep_type as TaskDependencyType
  }))
}

function getDepRow(
  db: Database,
  fromTaskId: string,
  toTaskId: string
): DepRow | undefined {
  return db
    .prepare(
      `SELECT from_task_id, to_task_id, dep_type, updated_at, deleted_at
       FROM task_dependencies
       WHERE from_task_id = ? AND to_task_id = ?`
    )
    .get(fromTaskId, toTaskId) as DepRow | undefined
}

export function upsertDependency(db: Database, input: UpsertDependencyInput): TaskDependency {
  if (input.fromTaskId === input.toTaskId) {
    throwLanpm('err.dependencySelf')
  }
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO task_dependencies (from_task_id, to_task_id, dep_type, updated_at, deleted_at)
     VALUES (@fromTaskId, @toTaskId, @type, @updatedAt, NULL)
     ON CONFLICT(from_task_id, to_task_id) DO UPDATE SET
       dep_type = excluded.dep_type,
       updated_at = excluded.updated_at,
       deleted_at = NULL`
  ).run({
    fromTaskId: input.fromTaskId,
    toTaskId: input.toTaskId,
    type: input.type,
    updatedAt: now
  })
  return {
    fromTaskId: input.fromTaskId,
    toTaskId: input.toTaskId,
    type: input.type
  }
}

/** Soft-delete for LWW; returns the edge that was deleted, or null. */
export function removeDependency(
  db: Database,
  fromTaskId: string,
  toTaskId: string
): TaskDependency | null {
  const existing = getDepRow(db, fromTaskId, toTaskId)
  if (!existing || existing.deleted_at) return null
  const now = new Date().toISOString()
  const result = db
    .prepare(
      `UPDATE task_dependencies
       SET deleted_at = ?, updated_at = ?
       WHERE from_task_id = ? AND to_task_id = ? AND deleted_at IS NULL`
    )
    .run(now, now, fromTaskId, toTaskId)
  if (result.changes === 0) return null
  return {
    fromTaskId,
    toTaskId,
    type: existing.dep_type as TaskDependencyType
  }
}

/**
 * B-01 / TASK-131 — remote task_dep_patch LWW by updatedAt.
 * Returns true when local SQLite changed.
 */
export function applyRemoteDepPatch(db: Database, payload: TaskDepPatchPayload): boolean {
  const { action, dependency, updatedAt } = payload
  const existing = getDepRow(db, dependency.fromTaskId, dependency.toTaskId)

  if (existing && existing.updated_at > updatedAt) return false
  if (existing && existing.updated_at === updatedAt) return false

  if (action === 'delete') {
    if (existing?.deleted_at) return false
    if (!existing) {
      db.prepare(
        `INSERT INTO task_dependencies (from_task_id, to_task_id, dep_type, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?)`
      ).run(dependency.fromTaskId, dependency.toTaskId, dependency.type, updatedAt, updatedAt)
      return true
    }
    db.prepare(
      `UPDATE task_dependencies
       SET deleted_at = ?, updated_at = ?, dep_type = ?
       WHERE from_task_id = ? AND to_task_id = ?`
    ).run(updatedAt, updatedAt, dependency.type, dependency.fromTaskId, dependency.toTaskId)
    return true
  }

  // upsert
  if (existing && !existing.deleted_at && existing.dep_type === dependency.type) {
    return false
  }
  db.prepare(
    `INSERT INTO task_dependencies (from_task_id, to_task_id, dep_type, updated_at, deleted_at)
     VALUES (@fromTaskId, @toTaskId, @type, @updatedAt, NULL)
     ON CONFLICT(from_task_id, to_task_id) DO UPDATE SET
       dep_type = excluded.dep_type,
       updated_at = excluded.updated_at,
       deleted_at = NULL`
  ).run({
    fromTaskId: dependency.fromTaskId,
    toTaskId: dependency.toTaskId,
    type: dependency.type,
    updatedAt
  })
  return true
}
