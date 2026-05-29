import assert from 'node:assert/strict'
import { KANBAN_COLUMN_LABELS, KANBAN_COLUMN_ORDER } from '../../src/shared/task/kanban.ts'
import { aggregateChildProgress, applyAggregatedProgress } from '../../src/shared/task/progress.ts'
import { validateOtherReason } from '../../src/shared/task/validation.ts'
import type { Task } from '../../src/shared/task/types.ts'

assert.equal(KANBAN_COLUMN_ORDER.length, 4)
assert.equal(KANBAN_COLUMN_LABELS.todo, 'TODO')
assert.equal(KANBAN_COLUMN_LABELS.other, 'OTHER')

assert.equal(validateOtherReason('other', ''), 'board.otherReasonRequired')
assert.equal(validateOtherReason('other', '  '), 'board.otherReasonRequired')
assert.equal(validateOtherReason('other', 'blocked'), null)
assert.equal(validateOtherReason('todo', undefined), null)

assert.equal(aggregateChildProgress([]), 0)
assert.equal(aggregateChildProgress([{ progressPercent: 10 }, { progressPercent: 30 }]), 20)

const tasks: Task[] = [
  {
    taskId: 'p1',
    groupId: 'g1',
    title: 'Parent',
    status: 'todo',
    priority: 'medium',
    progressPercent: 0,
    sortOrder: 0,
    createdBy: 'u1',
    createdAt: 't',
    updatedAt: 't'
  },
  {
    taskId: 'c1',
    groupId: 'g1',
    parentTaskId: 'p1',
    title: 'Child',
    status: 'doing',
    priority: 'medium',
    progressPercent: 40,
    sortOrder: 0,
    createdBy: 'u1',
    createdAt: 't',
    updatedAt: 't'
  },
  {
    taskId: 'c2',
    groupId: 'g1',
    parentTaskId: 'p1',
    title: 'Child2',
    status: 'doing',
    priority: 'medium',
    progressPercent: 80,
    sortOrder: 1,
    createdBy: 'u1',
    createdAt: 't',
    updatedAt: 't'
  }
]
const enriched = applyAggregatedProgress(tasks)
const parent = enriched.find((t) => t.taskId === 'p1')
assert.equal(parent?.progressPercent, 60)

console.log('verify-m3: ok')
