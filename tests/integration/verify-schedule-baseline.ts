/**
 * TASK-6501 — schedule_baselines SQLite round-trip (Electron ABI).
 * Paid gate is locked in verify:schedule-sku (assertPaidPluginLicensed).
 * Run via npm run verify:schedule-sku
 */
import assert from 'node:assert/strict'
import Database from 'better-sqlite3'
import { applyMigrations } from '../../src/main/storage/migrate.ts'
import { defaultScheduleForTask } from '../../src/shared/task/ganttAdapter.ts'
import {
  listGroupScheduleBaseline,
  replaceGroupScheduleBaseline
} from '../../src/main/storage/repositories/scheduleBaselineRepository.ts'
import { listTasksByGroup } from '../../src/main/storage/repositories/taskRepository.ts'

function insertTask(
  db: Database.Database,
  opts: {
    taskId: string
    groupId: string
    start?: string | null
    end?: string | null
    deleted?: boolean
  }
): void {
  const now = '2026-08-21T00:00:00.000Z'
  db.prepare(
    `INSERT INTO tasks (
      task_id, group_id, title, status, priority, progress_percent,
      start_date, end_date, milestone, sort_order, created_by, created_at, updated_at, deleted_at
    ) VALUES (?, ?, ?, 'todo', 'medium', 0, ?, ?, 0, 0, 'u1', ?, ?, ?)`
  ).run(
    opts.taskId,
    opts.groupId,
    opts.taskId,
    opts.start ?? null,
    opts.end ?? null,
    now,
    now,
    opts.deleted ? now : null
  )
}

function freezeGroup(db: Database.Database, groupId: string, frozenAt: string): number {
  const tasks = listTasksByGroup(db, groupId).map((task) => {
    const dates = defaultScheduleForTask(task)
    return { taskId: task.taskId, startDate: dates.startDate, endDate: dates.endDate }
  })
  replaceGroupScheduleBaseline(db, groupId, frozenAt, tasks)
  return tasks.length
}

const db = new Database(':memory:')
applyMigrations(db)
insertTask(db, { taskId: 't1', groupId: 'g1', start: '2026-08-01', end: '2026-08-10' })
insertTask(db, { taskId: 't2', groupId: 'g1', start: '2026-08-02', end: '2026-08-12' })
insertTask(db, {
  taskId: 'gone',
  groupId: 'g1',
  start: '2026-08-01',
  end: '2026-08-03',
  deleted: true
})
insertTask(db, { taskId: 'other', groupId: 'g2', start: '2026-09-01', end: '2026-09-02' })

const count = freezeGroup(db, 'g1', '2026-08-21T10:00:00.000Z')
assert.equal(count, 2)
const loaded = listGroupScheduleBaseline(db, 'g1')
assert.equal(loaded.frozenAt, '2026-08-21T10:00:00.000Z')
assert.equal(loaded.tasks.length, 2)
assert.ok(loaded.tasks.some((t) => t.taskId === 't1' && t.endDate === '2026-08-10'))
assert.equal(listGroupScheduleBaseline(db, 'g2').tasks.length, 0)

db.prepare(`UPDATE tasks SET end_date = '2026-08-30' WHERE task_id = 't1'`).run()
freezeGroup(db, 'g1', '2026-08-21T11:00:00.000Z')
const again = listGroupScheduleBaseline(db, 'g1')
assert.equal(again.frozenAt, '2026-08-21T11:00:00.000Z')
assert.equal(again.tasks.find((t) => t.taskId === 't1')?.endDate, '2026-08-30')
assert.equal(again.tasks.length, 2)
db.close()

console.log('verify:schedule-baseline OK')
