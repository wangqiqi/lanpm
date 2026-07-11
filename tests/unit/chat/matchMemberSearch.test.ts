import { describe, expect, it } from 'vitest'
import {
  filterTasksByAssigneeSearch,
  matchesMemberSearch
} from '@shared/chat/matchMemberSearch'

describe('matchesMemberSearch', () => {
  const alice = {
    userId: 'u_alice',
    displayName: '张三',
    mentionKeys: ['zhangsan', 'alice']
  }

  it('empty query matches all', () => {
    expect(matchesMemberSearch(alice, '')).toBe(true)
    expect(matchesMemberSearch(alice, '   ')).toBe(true)
  })

  it('matches display name substring and pinyin', () => {
    expect(matchesMemberSearch(alice, '张')).toBe(true)
    expect(matchesMemberSearch(alice, 'zs')).toBe(true)
  })

  it('matches mentionKeys and userId', () => {
    expect(matchesMemberSearch(alice, 'alice')).toBe(true)
    expect(matchesMemberSearch(alice, 'u_alice')).toBe(true)
  })

  it('rejects non-match', () => {
    expect(matchesMemberSearch(alice, 'bob')).toBe(false)
  })
})

describe('filterTasksByAssigneeSearch', () => {
  const members = [
    { userId: 'u1', displayName: 'Alice', mentionKeys: ['alice'] },
    { userId: 'u2', displayName: 'Bob', mentionKeys: ['bob'] }
  ]
  const tasks = [
    { taskId: 't1', assigneeUserId: 'u1' },
    { taskId: 't2', assigneeUserId: 'u2' },
    { taskId: 't3', assigneeUserId: undefined }
  ]

  it('returns all when query empty', () => {
    expect(filterTasksByAssigneeSearch(tasks, members, '').map((t) => t.taskId)).toEqual([
      't1',
      't2',
      't3'
    ])
  })

  it('filters by assignee name/pinyin and drops unassigned', () => {
    expect(filterTasksByAssigneeSearch(tasks, members, 'ali').map((t) => t.taskId)).toEqual([
      't1'
    ])
  })
})
