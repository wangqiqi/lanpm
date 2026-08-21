import { describe, expect, it } from 'vitest'
import {
  SCHEDULE_OVERLAP_COLOR,
  barStylesForAssigneeOverlap,
  countAssigneeOverlapTasks,
  findAssigneeOverlapTaskIds,
  ymdRangesOverlap
} from '../../../src/shared/task/assigneeOverlap.ts'
import type { Task } from '../../../src/shared/task/types.ts'

function task(partial: Partial<Task> & Pick<Task, 'taskId' | 'title'>): Task {
  return {
    groupId: 'g1',
    status: 'doing',
    priority: 'medium',
    progressPercent: 0,
    sortOrder: 0,
    createdBy: 'u1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: 't',
    ...partial
  }
}

describe('ymdRangesOverlap', () => {
  it('treats inclusive same-day touch as overlap', () => {
    expect(
      ymdRangesOverlap(
        { startDate: '2026-01-01', endDate: '2026-01-05' },
        { startDate: '2026-01-05', endDate: '2026-01-10' }
      )
    ).toBe(true)
  })

  it('does not overlap adjacent days', () => {
    expect(
      ymdRangesOverlap(
        { startDate: '2026-01-01', endDate: '2026-01-04' },
        { startDate: '2026-01-05', endDate: '2026-01-10' }
      )
    ).toBe(false)
  })
})

describe('findAssigneeOverlapTaskIds', () => {
  it('flags two dated tasks for the same assignee', () => {
    const ids = findAssigneeOverlapTaskIds([
      task({
        taskId: 'a',
        title: 'A',
        assigneeUserId: 'u1',
        startDate: '2026-08-01',
        endDate: '2026-08-10'
      }),
      task({
        taskId: 'b',
        title: 'B',
        assigneeUserId: 'u1',
        startDate: '2026-08-08',
        endDate: '2026-08-12'
      })
    ])
    expect([...ids].sort()).toEqual(['a', 'b'])
    expect(
      countAssigneeOverlapTasks([
        task({
          taskId: 'a',
          title: 'A',
          assigneeUserId: 'u1',
          startDate: '2026-08-01',
          endDate: '2026-08-10'
        }),
        task({
          taskId: 'b',
          title: 'B',
          assigneeUserId: 'u1',
          startDate: '2026-08-08',
          endDate: '2026-08-12'
        })
      ])
    ).toBe(2)
  })

  it('ignores missing assignee, missing dates, and deleted rows', () => {
    const ids = findAssigneeOverlapTaskIds([
      task({
        taskId: 'dated',
        title: 'D',
        assigneeUserId: 'u1',
        startDate: '2026-08-01',
        endDate: '2026-08-10'
      }),
      task({
        taskId: 'no-assignee',
        title: 'N',
        startDate: '2026-08-01',
        endDate: '2026-08-10'
      }),
      task({
        taskId: 'no-dates',
        title: 'C',
        assigneeUserId: 'u1',
        createdAt: '2026-08-01T00:00:00.000Z'
      }),
      task({
        taskId: 'gone',
        title: 'G',
        assigneeUserId: 'u1',
        startDate: '2026-08-01',
        endDate: '2026-08-10',
        deletedAt: 'x'
      })
    ])
    expect(ids.size).toBe(0)
  })

  it('does not collide different assignees on the same days', () => {
    const ids = findAssigneeOverlapTaskIds([
      task({
        taskId: 'a',
        title: 'A',
        assigneeUserId: 'u1',
        startDate: '2026-08-01',
        endDate: '2026-08-10'
      }),
      task({
        taskId: 'b',
        title: 'B',
        assigneeUserId: 'u2',
        startDate: '2026-08-01',
        endDate: '2026-08-10'
      })
    ])
    expect(ids.size).toBe(0)
  })

  it('tints overlap bars with violet not baseline orange', () => {
    const styles = barStylesForAssigneeOverlap({ backgroundColor: '#0066cc' }, true)
    expect(styles?.backgroundColor).toBe(SCHEDULE_OVERLAP_COLOR)
    expect(styles?.backgroundColor).not.toBe('#c2410c')
  })
})
