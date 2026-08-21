import { describe, expect, it } from 'vitest'
import { computeCriticalPath, computeFsCriticalPath } from '@shared/task/criticalPath'
import type { Task } from '@shared/task/types'
import type { TaskDependency } from '@shared/task/dependency'

function task(
  partial: Partial<Task> & Pick<Task, 'taskId' | 'title'> & { deps?: TaskDependency[] }
): Task {
  const { deps, ...rest } = partial
  return {
    groupId: 'g1',
    status: 'doing',
    priority: 'medium',
    progressPercent: 0,
    sortOrder: 0,
    createdBy: 'u1',
    createdAt: 't',
    updatedAt: 't',
    ...rest,
    dependencies: deps ?? rest.dependencies
  }
}

function dep(from: string, to: string, type: TaskDependency['type']): TaskDependency {
  return { fromTaskId: from, toTaskId: to, type }
}

function fs(from: string, to: string): TaskDependency {
  return dep(from, to, 'FS')
}

describe('computeCriticalPath', () => {
  it('returns no_eligible when nothing is dated', () => {
    expect(computeCriticalPath([task({ taskId: 'a', title: 'A' })])).toEqual({
      taskIds: [],
      emptyReason: 'no_eligible'
    })
  })

  it('returns no_fs when dated tasks have no dependency edges', () => {
    const a = task({
      taskId: 'a',
      title: 'A',
      startDate: '2026-01-01',
      endDate: '2026-01-03'
    })
    expect(computeCriticalPath([a])).toEqual({ taskIds: [], emptyReason: 'no_fs' })
  })

  it('picks the longest FS chain by duration', () => {
    const a = task({
      taskId: 'a',
      title: 'A',
      startDate: '2026-01-01',
      endDate: '2026-01-02'
    })
    const b = task({
      taskId: 'b',
      title: 'B',
      startDate: '2026-01-03',
      endDate: '2026-01-04',
      deps: [fs('a', 'b')]
    })
    const c = task({
      taskId: 'c',
      title: 'C',
      startDate: '2026-01-05',
      endDate: '2026-01-10',
      deps: [fs('b', 'c')]
    })
    const side = task({
      taskId: 's',
      title: 'Side',
      startDate: '2026-01-01',
      endDate: '2026-01-01'
    })
    expect(computeCriticalPath([a, b, c, side]).taskIds).toEqual(['a', 'b', 'c'])
  })

  it('includes SS/FF/SF edges as directed from→to', () => {
    const a = task({
      taskId: 'a',
      title: 'A',
      startDate: '2026-01-01',
      endDate: '2026-01-02'
    })
    const bSs = task({
      taskId: 'b',
      title: 'B',
      startDate: '2026-01-01',
      endDate: '2026-01-10',
      deps: [dep('a', 'b', 'SS')]
    })
    expect(computeCriticalPath([a, bSs]).taskIds).toEqual(['a', 'b'])

    const cFf = task({
      taskId: 'c',
      title: 'C',
      startDate: '2026-01-01',
      endDate: '2026-01-08',
      deps: [dep('a', 'c', 'FF')]
    })
    expect(computeCriticalPath([a, cFf]).taskIds).toEqual(['a', 'c'])

    const dSf = task({
      taskId: 'd',
      title: 'D',
      startDate: '2026-01-01',
      endDate: '2026-01-06',
      deps: [dep('a', 'd', 'SF')]
    })
    expect(computeCriticalPath([a, dSf]).taskIds).toEqual(['a', 'd'])
  })

  it('skips milestones and undated tasks', () => {
    const a = task({
      taskId: 'a',
      title: 'A',
      startDate: '2026-01-01',
      endDate: '2026-01-02'
    })
    const mile = task({
      taskId: 'm',
      title: 'M',
      milestone: true,
      startDate: '2026-01-03',
      endDate: '2026-01-03',
      deps: [fs('a', 'm')]
    })
    const b = task({
      taskId: 'b',
      title: 'B',
      startDate: '2026-01-04',
      endDate: '2026-01-05',
      deps: [fs('a', 'b')]
    })
    expect(computeCriticalPath([a, mile, b]).taskIds).toEqual(['a', 'b'])
  })

  it('returns cycle without throwing', () => {
    const a = task({
      taskId: 'a',
      title: 'A',
      startDate: '2026-01-01',
      endDate: '2026-01-02',
      deps: [fs('b', 'a')]
    })
    const b = task({
      taskId: 'b',
      title: 'B',
      startDate: '2026-01-03',
      endDate: '2026-01-04',
      deps: [fs('a', 'b')]
    })
    expect(computeCriticalPath([a, b])).toEqual({ taskIds: [], emptyReason: 'cycle' })
  })

  it('computeFsCriticalPath aliases computeCriticalPath', () => {
    const a = task({
      taskId: 'a',
      title: 'A',
      startDate: '2026-01-01',
      endDate: '2026-01-02'
    })
    const b = task({
      taskId: 'b',
      title: 'B',
      startDate: '2026-01-03',
      endDate: '2026-01-04',
      deps: [dep('a', 'b', 'SS')]
    })
    expect(computeFsCriticalPath([a, b])).toEqual(computeCriticalPath([a, b]))
  })
})
