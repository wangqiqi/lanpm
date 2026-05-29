import assert from 'node:assert/strict'
import {
  diffDaysInclusive,
  getExpectedProgressPercent,
  getTaskScheduleHealth,
  resolveTaskScheduleWindow
} from '../../../src/shared/task/scheduleHealth.ts'
import type { Task } from '../../../src/shared/task/types.ts'

function task(partial: Partial<Task> & Pick<Task, 'taskId' | 'title'>): Task {
  return {
    groupId: 'g1',
    status: 'doing',
    priority: 'medium',
    progressPercent: 0,
    sortOrder: 0,
    createdBy: 'u1',
    createdAt: 't',
    updatedAt: 't',
    ...partial
  }
}

const jan1 = new Date(2026, 0, 1)
const jan3 = new Date(2026, 0, 3)
const jan5 = new Date(2026, 0, 5)

assert.equal(diffDaysInclusive(new Date(2026, 0, 1), new Date(2026, 0, 4)), 4)

const fourDay = { startDate: '2026-01-01', endDate: '2026-01-04' }
assert.equal(getExpectedProgressPercent(fourDay, jan3), 75)

const behindTask = task({
  taskId: 't1',
  title: 'Behind',
  startDate: '2026-01-01',
  endDate: '2026-01-04',
  progressPercent: 25
})
assert.equal(getTaskScheduleHealth(behindTask, jan3), 'behind')

const onTrack = task({ ...behindTask, progressPercent: 80 })
assert.equal(getTaskScheduleHealth(onTrack, jan3), 'on_track')

const notStarted = task({
  taskId: 't0',
  title: 'Future',
  startDate: '2026-01-10',
  endDate: '2026-01-14',
  progressPercent: 0
})
assert.equal(getTaskScheduleHealth(notStarted, jan3), 'none')

const overdue = task({
  taskId: 't2',
  title: 'Late',
  endDate: '2026-01-04',
  progressPercent: 10
})
assert.equal(getTaskScheduleHealth(overdue, jan5), 'overdue')

const doneLate = task({ ...overdue, status: 'done' })
assert.equal(getTaskScheduleHealth(doneLate, jan5), 'none')

assert.deepEqual(resolveTaskScheduleWindow(task({ taskId: 'x', title: 'm', milestone: true, endDate: '2026-02-01' })), {
  startDate: '2026-02-01',
  endDate: '2026-02-01'
})

console.log('scheduleHealth.test.ts: ok')
