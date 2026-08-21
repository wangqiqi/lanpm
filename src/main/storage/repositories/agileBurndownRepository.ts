import type { Database } from 'better-sqlite3'
import type { BurndownPoint } from '../../../shared/task/agileBurndown.ts'

interface SampleRow {
  group_id: string
  day: string
  remaining_points: number
  sampled_at: string
}

export function upsertAgileBurndownSample(
  db: Database,
  groupId: string,
  day: string,
  remainingPoints: number,
  sampledAt: string
): void {
  db.prepare(
    `INSERT INTO agile_burndown_samples (group_id, day, remaining_points, sampled_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(group_id, day) DO UPDATE SET
       remaining_points = excluded.remaining_points,
       sampled_at = excluded.sampled_at`
  ).run(groupId, day, remainingPoints, sampledAt)
}

export function listAgileBurndownSamples(
  db: Database,
  groupId: string
): BurndownPoint[] {
  const rows = db
    .prepare(
      `SELECT group_id, day, remaining_points, sampled_at
       FROM agile_burndown_samples WHERE group_id = ? ORDER BY day ASC`
    )
    .all(groupId) as SampleRow[]
  return rows.map((r) => ({ day: r.day, remaining: r.remaining_points }))
}
