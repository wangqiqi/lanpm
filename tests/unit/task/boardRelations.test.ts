import { describe, expect, it } from 'vitest'
import {
  buildBoardRelationMap,
  collectRelatedTaskIds,
  getDependencyBlockersForStatus,
  getRootTaskId,
  listFocusDependencyEdges
} from '@shared/task/boardRelations'
import type { Task } from '@shared/task/types'

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

describe('boardRelations', () => {
  it('resolves root task id', () => {
    expect(getRootTaskId('child', byId)).toBe('root')
  })

  it('collects related task ids', () => {
    const related = collectRelatedTaskIds('child', tasks, byId)
    expect(related).toContain('root')
    expect(related).toContain('child')
  })

  it('blocks FS dependency until predecessor is done', () => {
    const blockers = getDependencyBlockersForStatus(tasks[2]!, byId, 'done')
    expect(blockers).toHaveLength(1)
    expect(blockers[0]!.taskId).toBe('root')
  })

  it('blocks SS dependency until predecessor starts', () => {
    const ssTasks: Task[] = [
      task({ taskId: 'a', title: 'A', status: 'todo' }),
      task({
        taskId: 'b',
        title: 'B',
        dependencies: [{ fromTaskId: 'a', toTaskId: 'b', type: 'SS' }]
      })
    ]
    const ssById = new Map(ssTasks.map((t) => [t.taskId, t]))
    expect(getDependencyBlockersForStatus(ssTasks[1]!, ssById, 'doing')).toHaveLength(1)
  })

  it('builds board relation map', () => {
    const map = buildBoardRelationMap(tasks)
    expect(map.get('blocked')?.blockedBy).toHaveLength(1)
    expect(map.get('child')?.familyIndex ?? -1).toBeGreaterThanOrEqual(0)
  })

  it('lists FS focus edges for predecessor and successor', () => {
    const fromBlocked = listFocusDependencyEdges('blocked', tasks, { types: ['FS'] })
    expect(fromBlocked).toEqual([
      {
        fromTaskId: 'root',
        toTaskId: 'blocked',
        type: 'FS',
        direction: 'incoming'
      }
    ])

    const fromRoot = listFocusDependencyEdges('root', tasks, { types: ['FS'] })
    expect(fromRoot).toEqual([
      {
        fromTaskId: 'root',
        toTaskId: 'blocked',
        type: 'FS',
        direction: 'outgoing'
      }
    ])
  })

  it('filters non-FS types when types is FS-only', () => {
    const mixed: Task[] = [
      task({ taskId: 'a', title: 'A' }),
      task({
        taskId: 'b',
        title: 'B',
        dependencies: [
          { fromTaskId: 'a', toTaskId: 'b', type: 'FS' },
          { fromTaskId: 'a', toTaskId: 'b', type: 'SS' }
        ]
      })
    ]
    const edges = listFocusDependencyEdges('b', mixed, { types: ['FS'] })
    expect(edges).toHaveLength(1)
    expect(edges[0]!.type).toBe('FS')
  })
})
