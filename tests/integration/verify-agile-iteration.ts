/**
 * TASK-7001 — agile_iterations SQLite round-trip (Electron ABI).
 */
import assert from 'node:assert/strict'
import Database from 'better-sqlite3'
import { applyMigrations } from '../../src/main/storage/migrate.ts'
import { tasksInCurrentIteration } from '../../src/shared/task/agileIteration.ts'
import {
  assignTaskIteration,
  getCurrentIterationId,
  getTaskIterationId,
  insertAgileIteration,
  listAgileIterationSamples,
  listAgileIterations,
  setCurrentIterationId,
  upsertAgileIterationSample
} from '../../src/main/storage/repositories/agileIterationRepository.ts'

const db = new Database(':memory:')
applyMigrations(db)

const now = '2026-08-21T00:00:00.000Z'
db.prepare(
  `INSERT INTO tasks (
    task_id, group_id, title, status, priority, progress_percent,
    milestone, sort_order, created_by, created_at, updated_at
  ) VALUES (?, ?, ?, 'todo', 'medium', 0, 0, 0, 'u1', ?, ?)`
).run('t1', 'g1', 't1', now, now)
db.prepare(
  `INSERT INTO tasks (
    task_id, group_id, title, status, priority, progress_percent,
    milestone, sort_order, created_by, created_at, updated_at
  ) VALUES (?, ?, ?, 'todo', 'medium', 0, 0, 0, 'u1', ?, ?)`
).run('t2', 'g1', 't2', now, now)

insertAgileIteration(db, {
  iterationId: 'it1',
  groupId: 'g1',
  name: 'Sprint 1',
  startDate: '2026-08-17',
  endDate: '2026-08-30',
  createdAt: now,
  updatedAt: now
})
const listed = listAgileIterations(db, 'g1')
assert.equal(listed.length, 1)
assert.equal(listed[0]?.name, 'Sprint 1')

assert.equal(getCurrentIterationId(db, 'g1'), null)
setCurrentIterationId(db, 'g1', 'it1')
assert.equal(getCurrentIterationId(db, 'g1'), 'it1')
setCurrentIterationId(db, 'g1', null)
assert.equal(getCurrentIterationId(db, 'g1'), null)

assignTaskIteration(db, 't1', 'it1')
assert.equal(getTaskIterationId(db, 't1'), 'it1')
assert.equal(getTaskIterationId(db, 't2'), null)

const scoped = tasksInCurrentIteration(
  [
    { iterationId: 'it1' },
    { iterationId: undefined }
  ],
  'it1'
)
assert.equal(scoped.length, 1)

upsertAgileIterationSample(db, 'it1', '2026-08-21', 8, now)
upsertAgileIterationSample(db, 'it1', '2026-08-21', 5, now)
const samples = listAgileIterationSamples(db, 'it1')
assert.equal(samples.length, 1)
assert.equal(samples[0]?.remaining, 5)

db.close()
console.log('verify:agile-iteration OK')
