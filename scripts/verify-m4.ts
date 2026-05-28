/**
 * M4 gantt adapter + file category smoke.
 * Run: npm run verify:m4
 */
import assert from 'node:assert/strict'
import { tasksToGanttBars, defaultScheduleForTask, ganttDatesToYmd } from '../src/shared/task/ganttAdapter.ts'
import { inferCategory } from '../src/shared/file/types.ts'
import type { Task } from '../src/shared/task/types.ts'

const task: Task = {
  taskId: 't1',
  groupId: 'g1',
  title: 'Demo',
  status: 'todo',
  priority: 'medium',
  progressPercent: 50,
  sortOrder: 0,
  createdBy: 'u1',
  createdAt: '2026-01-10T00:00:00.000Z',
  updatedAt: '2026-01-10T00:00:00.000Z',
  milestone: false
}

const schedule = defaultScheduleForTask(task)
assert.match(schedule.startDate, /^\d{4}-\d{2}-\d{2}$/)

const bars = tasksToGanttBars(
  [{ ...task, startDate: '2026-01-01', endDate: '2026-01-07' }],
  [{ fromTaskId: 't0', toTaskId: 't1', type: 'FS' }]
)
assert.equal(bars.length, 1)
assert.deepEqual(bars[0]?.dependencies, ['t0'])

const ms = tasksToGanttBars([{ ...task, taskId: 'm1', milestone: true }], [])
assert.equal(ms[0]?.type, 'milestone')

const dates = ganttDatesToYmd(new Date('2026-03-01'), new Date('2026-03-01'), true)
assert.equal(dates.startDate, dates.endDate)

assert.equal(inferCategory('png'), 'image')
assert.equal(inferCategory('docx'), 'document')

console.log('verify-m4: ok')
