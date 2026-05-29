import assert from 'node:assert/strict'
import {
  buildBoardRelationMap,
  collectRelatedTaskIds,
  getDependencyBlockersForStatus,
  getRootTaskId
} from '../../../src/shared/task/boardRelations.ts'
import type { Task } from '../../../src/shared/task/types.ts'

function task(partial: Partial<Task> & Pick<Task, 'taskId' | 'title'>): Task {
  return {
    groupId: 'g1',
    status: 'todo',
    priority: 'medium',
    progressPercent: 0,
    sortOrder: 0,
    createdBy: 'u1',
    createdAt: 't',
    updatedAt: 't',
    ...partial
  }
}

const tasks: Task[] = [
  task({ taskId: 'root', title: 'M1' }),
  task({ taskId: 'child', title: 'Sub', parentTaskId: 'root', status: 'doing' }),
  task({
    taskId: 'blocked',
    title: 'After',
    dependencies: [{ fromTaskId: 'root', toTaskId: 'blocked', type: 'FS' }]
  })
]

const byId = new Map(tasks.map((t) => [t.taskId, t]))

assert.equal(getRootTaskId('child', byId), 'root')

const related = collectRelatedTaskIds('child', tasks, byId)
assert.ok(related.includes('root'))
assert.ok(related.includes('child'))

const blockers = getDependencyBlockersForStatus(tasks[2]!, byId, 'done')
assert.equal(blockers.length, 1)
assert.equal(blockers[0]!.taskId, 'root')

const ssTasks: Task[] = [
  task({ taskId: 'a', title: 'A', status: 'todo' }),
  task({
    taskId: 'b',
    title: 'B',
    dependencies: [{ fromTaskId: 'a', toTaskId: 'b', type: 'SS' }]
  })
]
const ssById = new Map(ssTasks.map((t) => [t.taskId, t]))
assert.equal(getDependencyBlockersForStatus(ssTasks[1]!, ssById, 'doing').length, 1)

const map = buildBoardRelationMap(tasks)
assert.equal(map.get('blocked')?.blockedBy.length, 1)
assert.ok((map.get('child')?.familyIndex ?? -1) >= 0)

console.log('boardRelations.test: ok')
