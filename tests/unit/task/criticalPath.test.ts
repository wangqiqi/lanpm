import { describe, expect, it } from 'vitest'
import { computeFsCriticalPath } from '@shared/task/criticalPath'
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
    dependencies: deps,
    ...rest
  }
}

function fs(from: string, to: string): TaskDependency {
  return { fromTaskId: from, toTaskId: to, type: 'FS' }
}

describe('computeFsCriticalPath', () => {
  it('returns no_eligible when nothing is dated', () => {
    expect(computeFsCriticalPath([task({ taskId: 'a', title: 'A' })])).toEqual({
      taskIds: [],
      emptyReason: 'no_eligible'
    })
  })

  it('returns no_fs when dated tasks have no FS edges', () => {
    const a = task({
      taskId: 'a',
      title: 'A',
      startDate: '2026-01-01',
      endDate: '2026-01-03'
    })
    expect(computeFsCriticalPath([a])).toEqual({ taskIds: [], emptyReason: 'no_fs' })
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
    expect(computeFsCriticalPath([a, b, c, side]).taskIds).toEqual(['a', 'b', 'c'])
  })

  it('ignores SS/FF/SF edges', () => {
    const a = task({
      taskId: 'a',
      title: 'A',
      startDate: '2026-01-01',
      endDate: '2026-01-03'
    })
    const b = task({
      taskId: 'b',
      title: 'B',
      startDate: '2026-01-01',
      endDate: '2026-01-10',
      deps: [{ fromTaskId: 'a', toTaskId: 'b', type: 'SS' }]
    })
    expect(computeFsCriticalPath([a, b])).toEqual({ taskIds: [], emptyReason: 'no_fs' })
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
    expect(computeFsCriticalPath([a, mile, b]).taskIds).toEqual(['a', 'b'])
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
    expect(computeFsCriticalPath([a, b])).toEqual({ taskIds: [], emptyReason: 'cycle' })
  })
})
