import { describe, expect, it } from 'vitest'
import {
  countMineOpenTasks,
  isMineOpenStatus,
  isMineOpenTask,
  MINE_OPEN_STATUSES
} from '@shared/badge/mineOpen'

describe('mineOpen badge semantics (TASK-201)', () => {
  it('exposes todo and doing as open statuses', () => {
    expect(MINE_OPEN_STATUSES).toEqual(['todo', 'doing'])
    expect(isMineOpenStatus('todo')).toBe(true)
    expect(isMineOpenStatus('doing')).toBe(true)
    expect(isMineOpenStatus('done')).toBe(false)
    expect(isMineOpenStatus('other')).toBe(false)
  })

  it('counts only tasks assigned to me that are todo/doing', () => {
    const me = 'user-me'
    const tasks = [
      { assigneeUserId: me, status: 'todo' },
      { assigneeUserId: me, status: 'doing' },
      { assigneeUserId: me, status: 'done' },
      { assigneeUserId: 'other', status: 'todo' },
      { assigneeUserId: undefined, status: 'todo' },
      { assigneeUserId: me, status: 'todo', deletedAt: '2026-07-01T00:00:00.000Z' }
    ]
    expect(countMineOpenTasks(tasks, me)).toBe(2)
  })

  it('returns false for empty userId', () => {
    expect(isMineOpenTask({ assigneeUserId: 'x', status: 'todo' }, '')).toBe(false)
  })

  it('requires exact assignee match', () => {
    expect(isMineOpenTask({ assigneeUserId: 'a', status: 'doing' }, 'a')).toBe(true)
    expect(isMineOpenTask({ assigneeUserId: 'a', status: 'doing' }, 'b')).toBe(false)
    expect(isMineOpenTask({ assigneeUserId: null, status: 'todo' }, 'a')).toBe(false)
  })
})
