import type { Database } from 'better-sqlite3'
import type { AgileIteration, AgileIterationSnapshot } from '../../../shared/task/agileIteration.ts'
import type { BurndownPoint } from '../../../shared/task/agileBurndown.ts'

interface IterationRow {
  iteration_id: string
  group_id: string
  name: string
  start_date: string
  end_date: string
  created_at: string
  updated_at: string
}

interface CurrentRow {
  group_id: string
  iteration_id: string | null
}

interface SampleRow {
  iteration_id: string
  day: string
  remaining_points: number
  sampled_at: string
}

function rowToIteration(row: IterationRow): AgileIteration {
  return {
    iterationId: row.iteration_id,
    groupId: row.group_id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function insertAgileIteration(db: Database, row: AgileIteration): void {
  db.prepare(
    `INSERT INTO agile_iterations (
      iteration_id, group_id, name, start_date, end_date, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    row.iterationId,
    row.groupId,
    row.name,
    row.startDate,
    row.endDate,
    row.createdAt,
    row.updatedAt
  )
}

export function listAgileIterations(db: Database, groupId: string): AgileIteration[] {
  const rows = db
    .prepare(
      `SELECT iteration_id, group_id, name, start_date, end_date, created_at, updated_at
       FROM agile_iterations WHERE group_id = ? ORDER BY start_date ASC, created_at ASC`
    )
    .all(groupId) as IterationRow[]
  return rows.map(rowToIteration)
}

export function getAgileIteration(
  db: Database,
  iterationId: string
): AgileIteration | null {
  const row = db
    .prepare(
      `SELECT iteration_id, group_id, name, start_date, end_date, created_at, updated_at
       FROM agile_iterations WHERE iteration_id = ?`
    )
    .get(iterationId) as IterationRow | undefined
  return row ? rowToIteration(row) : null
}

export function getCurrentIterationId(db: Database, groupId: string): string | null {
  const row = db
    .prepare(`SELECT group_id, iteration_id FROM agile_iteration_current WHERE group_id = ?`)
    .get(groupId) as CurrentRow | undefined
  const id = row?.iteration_id
  return id && id.trim() ? id : null
}

export function setCurrentIterationId(
  db: Database,
  groupId: string,
  iterationId: string | null
): void {
  db.prepare(
    `INSERT INTO agile_iteration_current (group_id, iteration_id)
     VALUES (?, ?)
     ON CONFLICT(group_id) DO UPDATE SET iteration_id = excluded.iteration_id`
  ).run(groupId, iterationId)
}

export function assignTaskIteration(
  db: Database,
  taskId: string,
  iterationId: string | null
): void {
  db.prepare(`UPDATE tasks SET iteration_id = ? WHERE task_id = ?`).run(iterationId, taskId)
}

export function getTaskIterationId(db: Database, taskId: string): string | null {
  const row = db
    .prepare(`SELECT iteration_id FROM tasks WHERE task_id = ?`)
    .get(taskId) as { iteration_id: string | null } | undefined
  const id = row?.iteration_id
  return id && id.trim() ? id : null
}

export function listAgileIterationSnapshot(db: Database, groupId: string): AgileIterationSnapshot {
  return {
    groupId,
    currentIterationId: getCurrentIterationId(db, groupId),
    iterations: listAgileIterations(db, groupId)
  }
}

export function upsertAgileIterationSample(
  db: Database,
  iterationId: string,
  day: string,
  remainingPoints: number,
  sampledAt: string
): void {
  db.prepare(
    `INSERT INTO agile_iteration_samples (iteration_id, day, remaining_points, sampled_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(iteration_id, day) DO UPDATE SET
       remaining_points = excluded.remaining_points,
       sampled_at = excluded.sampled_at`
  ).run(iterationId, day, remainingPoints, sampledAt)
}

export function listAgileIterationSamples(db: Database, iterationId: string): BurndownPoint[] {
  const rows = db
    .prepare(
      `SELECT iteration_id, day, remaining_points, sampled_at
       FROM agile_iteration_samples WHERE iteration_id = ? ORDER BY day ASC`
    )
    .all(iterationId) as SampleRow[]
  return rows.map((r) => ({ day: r.day, remaining: r.remaining_points }))
}
