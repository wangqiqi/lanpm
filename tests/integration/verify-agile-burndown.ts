/**
 * TASK-6601 — agile_burndown_samples SQLite round-trip (Electron ABI).
 * Paid gate locked in verify:agile-sku.
 */
import assert from 'node:assert/strict'
import Database from 'better-sqlite3'
import { applyMigrations } from '../../src/main/storage/migrate.ts'
import { remainingStoryPoints } from '../../src/shared/task/agileBurndown.ts'
import {
  listAgileBurndownSamples,
  upsertAgileBurndownSample
} from '../../src/main/storage/repositories/agileBurndownRepository.ts'
import { listTasksByGroup } from '../../src/main/storage/repositories/taskRepository.ts'

function insertTask(
  db: Database.Database,
  opts: { taskId: string; groupId: string; status: string; points: number | null }
): void {
  const now = '2026-08-21T00:00:00.000Z'
  db.prepare(
    `INSERT INTO tasks (
      task_id, group_id, title, status, priority, progress_percent, story_points,
      milestone, sort_order, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'medium', 0, ?, 0, 0, 'u1', ?, ?)`
  ).run(opts.taskId, opts.groupId, opts.taskId, opts.status, opts.points, now, now)
}

const db = new Database(':memory:')
applyMigrations(db)
insertTask(db, { taskId: 't1', groupId: 'g1', status: 'todo', points: 5 })
insertTask(db, { taskId: 't2', groupId: 'g1', status: 'done', points: 3 })
const remaining = remainingStoryPoints(listTasksByGroup(db, 'g1'))
assert.equal(remaining, 5)
upsertAgileBurndownSample(db, 'g1', '2026-08-21', remaining, '2026-08-21T10:00:00.000Z')
upsertAgileBurndownSample(db, 'g1', '2026-08-21', 4, '2026-08-21T11:00:00.000Z')
const rows = listAgileBurndownSamples(db, 'g1')
assert.equal(rows.length, 1)
assert.equal(rows[0]?.remaining, 4)
db.close()
console.log('verify:agile-burndown OK')
