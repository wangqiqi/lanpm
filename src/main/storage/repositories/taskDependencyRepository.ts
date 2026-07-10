import type { Database } from 'better-sqlite3'
import { throwLanpm } from '../../../shared/errors/lanpmError.ts'
import type { TaskDependency, TaskDependencyType, UpsertDependencyInput } from '../../../shared/task/dependency.ts'
import type { TaskDepPatchPayload } from '../../../shared/task/sync.ts'
import { lwwShouldApply } from '../../../shared/sync/lww.ts'
import { getMeta } from './syncMetaRepository.ts'

interface DepRow {
  from_task_id: string
  to_task_id: string
  dep_type: string
  updated_at: string
  deleted_at: string | null
  last_writer_device_id: string
}

function localWriterDeviceId(db: Database): string {
  return getMeta(db, 'local_device_id') ?? ''
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

/** Max dependency updated_at in group (including soft-deleted); empty when none. */
export function getMaxDepUpdatedAt(db: Database, groupId: string): string {
  const row = db
    .prepare(
      `SELECT MAX(d.updated_at) AS max_ts
       FROM task_dependencies d
       INNER JOIN tasks tf ON tf.task_id = d.from_task_id AND tf.group_id = ?`
    )
    .get(groupId) as { max_ts: string | null } | undefined
  return row?.max_ts ?? ''
}

/**
 * Offline pull: dependency edges (incl. soft-delete) updated after sinceUpdatedAt.
 */
export function listDependenciesSince(
  db: Database,
  groupId: string,
  sinceUpdatedAt: string,
  minUpdatedAt: string,
  limit = 100
): TaskDepPatchPayload[] {
  const rows = db
    .prepare(
      `SELECT d.from_task_id, d.to_task_id, d.dep_type, d.updated_at, d.deleted_at
       FROM task_dependencies d
       INNER JOIN tasks tf ON tf.task_id = d.from_task_id AND tf.group_id = ?
       WHERE d.updated_at > ?
         AND d.updated_at >= ?
       ORDER BY d.updated_at ASC, d.from_task_id ASC, d.to_task_id ASC
       LIMIT ?`
    )
    .all(groupId, sinceUpdatedAt, minUpdatedAt, limit) as DepRow[]

  return rows.map((r) => ({
    action: r.deleted_at ? ('delete' as const) : ('upsert' as const),
    groupId,
    dependency: {
      fromTaskId: r.from_task_id,
      toTaskId: r.to_task_id,
      type: r.dep_type as TaskDependencyType
    },
    updatedAt: r.updated_at
  }))
}

function getDepRow(
  db: Database,
  fromTaskId: string,
  toTaskId: string
): DepRow | undefined {
  return db
    .prepare(
      `SELECT from_task_id, to_task_id, dep_type, updated_at, deleted_at, last_writer_device_id
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
  const writer = localWriterDeviceId(db)
  db.prepare(
    `INSERT INTO task_dependencies (from_task_id, to_task_id, dep_type, updated_at, deleted_at, last_writer_device_id)
     VALUES (@fromTaskId, @toTaskId, @type, @updatedAt, NULL, @lastWriterDeviceId)
     ON CONFLICT(from_task_id, to_task_id) DO UPDATE SET
       dep_type = excluded.dep_type,
       updated_at = excluded.updated_at,
       deleted_at = NULL,
       last_writer_device_id = excluded.last_writer_device_id`
  ).run({
    fromTaskId: input.fromTaskId,
    toTaskId: input.toTaskId,
    type: input.type,
    updatedAt: now,
    lastWriterDeviceId: writer
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
       SET deleted_at = ?, updated_at = ?, last_writer_device_id = ?
       WHERE from_task_id = ? AND to_task_id = ? AND deleted_at IS NULL`
    )
    .run(now, now, localWriterDeviceId(db), fromTaskId, toTaskId)
  if (result.changes === 0) return null
  return {
    fromTaskId,
    toTaskId,
    type: existing.dep_type as TaskDependencyType
  }
}

/**
 * B-01 / TASK-131 / TASK-143 — remote task_dep_patch LWW；平局用 senderDeviceId。
 * Returns true when local SQLite changed.
 */
export function applyRemoteDepPatch(
  db: Database,
  payload: TaskDepPatchPayload,
  remoteDeviceId: string
): boolean {
  const { action, dependency, updatedAt } = payload
  const existing = getDepRow(db, dependency.fromTaskId, dependency.toTaskId)

  if (
    existing &&
    !lwwShouldApply(
      updatedAt,
      existing.updated_at,
      remoteDeviceId,
      existing.last_writer_device_id
    )
  ) {
    return false
  }

  if (action === 'delete') {
    if (existing?.deleted_at) return false
    if (!existing) {
      db.prepare(
        `INSERT INTO task_dependencies (from_task_id, to_task_id, dep_type, updated_at, deleted_at, last_writer_device_id)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(
        dependency.fromTaskId,
        dependency.toTaskId,
        dependency.type,
        updatedAt,
        updatedAt,
        remoteDeviceId
      )
      return true
    }
    db.prepare(
      `UPDATE task_dependencies
       SET deleted_at = ?, updated_at = ?, dep_type = ?, last_writer_device_id = ?
       WHERE from_task_id = ? AND to_task_id = ?`
    ).run(
      updatedAt,
      updatedAt,
      dependency.type,
      remoteDeviceId,
      dependency.fromTaskId,
      dependency.toTaskId
    )
    return true
  }

  // upsert — same type already present: still stamp writer if LWW said apply (timestamp/device won)
  if (existing && !existing.deleted_at && existing.dep_type === dependency.type) {
    if (existing.updated_at === updatedAt && existing.last_writer_device_id === remoteDeviceId) {
      return false
    }
  }
  db.prepare(
    `INSERT INTO task_dependencies (from_task_id, to_task_id, dep_type, updated_at, deleted_at, last_writer_device_id)
     VALUES (@fromTaskId, @toTaskId, @type, @updatedAt, NULL, @lastWriterDeviceId)
     ON CONFLICT(from_task_id, to_task_id) DO UPDATE SET
       dep_type = excluded.dep_type,
       updated_at = excluded.updated_at,
       deleted_at = NULL,
       last_writer_device_id = excluded.last_writer_device_id`
  ).run({
    fromTaskId: dependency.fromTaskId,
    toTaskId: dependency.toTaskId,
    type: dependency.type,
    updatedAt,
    lastWriterDeviceId: remoteDeviceId
  })
  return true
}
