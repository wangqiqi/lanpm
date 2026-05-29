import assert from 'node:assert/strict'
import { mergeGanttBarStyles, GANTT_OVERDUE_BAR } from '../../../src/shared/task/scheduleHealthGantt.ts'
import { countScheduleHealth } from '../../../src/shared/task/scheduleHealth.ts'
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

const jan3 = new Date(2026, 0, 3)
const jan5 = new Date(2026, 0, 5)

const overdueStyles = mergeGanttBarStyles(
  task({
    taskId: 't1',
    title: 'Late',
    endDate: '2026-01-04',
    progressPercent: 10
  }),
  { backgroundColor: '#0071e3', backgroundSelectedColor: '#0071e3', progressColor: '#0071e3', progressSelectedColor: '#0071e3' },
  jan5
)
assert.equal(overdueStyles?.backgroundColor, GANTT_OVERDUE_BAR.backgroundColor)

const behindStyles = mergeGanttBarStyles(
  task({
    taskId: 't2',
    title: 'Behind',
    startDate: '2026-01-01',
    endDate: '2026-01-04',
    progressPercent: 25
  }),
  { backgroundColor: '#0071e3', backgroundSelectedColor: '#0071e3', progressColor: '#0071e3', progressSelectedColor: '#0071e3' },
  jan3
)
assert.equal(behindStyles?.progressColor, '#c99700')
assert.equal(behindStyles?.backgroundColor, '#0071e3')

const onTrackStyles = mergeGanttBarStyles(
  task({
    taskId: 't3',
    title: 'OK',
    startDate: '2026-01-01',
    endDate: '2026-01-04',
    progressPercent: 80
  }),
  { backgroundColor: '#0071e3', backgroundSelectedColor: '#0071e3', progressColor: '#0071e3', progressSelectedColor: '#0071e3' },
  jan3
)
assert.equal(onTrackStyles?.progressColor, '#34c759')

const counts = countScheduleHealth([
  task({ taskId: 'a', title: 'A', endDate: '2026-01-04', progressPercent: 0 }),
  task({
    taskId: 'b',
    title: 'B',
    startDate: '2026-01-01',
    endDate: '2026-01-04',
    progressPercent: 25
  })
], jan5)
assert.equal(counts.overdue, 2)
assert.equal(counts.behind, 0)

console.log('scheduleHealthGantt.test.ts: ok')
