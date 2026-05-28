import type { Database } from 'better-sqlite3'
import type { TaskDependency, TaskDependencyType, UpsertDependencyInput } from '../../../shared/task/dependency'

interface DepRow {
  from_task_id: string
  to_task_id: string
  dep_type: string
}

export function listDependenciesByGroup(db: Database, groupId: string): TaskDependency[] {
  const rows = db
    .prepare(
      `SELECT d.from_task_id, d.to_task_id, d.dep_type
       FROM task_dependencies d
       INNER JOIN tasks tf ON tf.task_id = d.from_task_id AND tf.group_id = ?
       INNER JOIN tasks tt ON tt.task_id = d.to_task_id AND tt.group_id = ?
       WHERE tf.deleted_at IS NULL AND tt.deleted_at IS NULL`
    )
    .all(groupId, groupId) as DepRow[]

  return rows.map((r) => ({
    fromTaskId: r.from_task_id,
    toTaskId: r.to_task_id,
    type: r.dep_type as TaskDependencyType
  }))
}

export function upsertDependency(db: Database, input: UpsertDependencyInput): TaskDependency {
  if (input.fromTaskId === input.toTaskId) {
    throw new Error('任务不能依赖自身')
  }
  db.prepare(
    `INSERT INTO task_dependencies (from_task_id, to_task_id, dep_type)
     VALUES (@fromTaskId, @toTaskId, @type)
     ON CONFLICT(from_task_id, to_task_id) DO UPDATE SET dep_type = excluded.dep_type`
  ).run({
    fromTaskId: input.fromTaskId,
    toTaskId: input.toTaskId,
    type: input.type
  })
  return {
    fromTaskId: input.fromTaskId,
    toTaskId: input.toTaskId,
    type: input.type
  }
}

export function removeDependency(
  db: Database,
  fromTaskId: string,
  toTaskId: string
): boolean {
  const result = db
    .prepare(`DELETE FROM task_dependencies WHERE from_task_id = ? AND to_task_id = ?`)
    .run(fromTaskId, toTaskId)
  return result.changes > 0
}
