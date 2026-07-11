import { describe, expect, it } from 'vitest'
import {
  buildAssigneeNudgeDraft,
  classifyDue,
  dueNotifyDedupeKey,
  isRelevantDueTask,
  localYmd,
  matchesAssigneeAlias,
  selectDueNudgeTasks
} from '@shared/task/dueNudge'
import { orderMentionCandidates } from '@shared/chat/mentionOrder'

describe('dueNudge', () => {
  it('classifyDue today/overdue', () => {
    expect(classifyDue('2026-07-11', '2026-07-11')).toBe('today')
    expect(classifyDue('2026-07-10', '2026-07-11')).toBe('overdue')
    expect(classifyDue('2026-07-12', '2026-07-11')).toBeNull()
    expect(classifyDue(undefined, '2026-07-11')).toBeNull()
  })

  it('localYmd format', () => {
    expect(localYmd(new Date('2026-07-11T15:00:00'))).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('selectDueNudgeTasks filters relevance and open status', () => {
    const me = 'u1'
    const list = selectDueNudgeTasks(
      [
        {
          taskId: 't1',
          groupId: 'g1',
          title: 'Mine overdue',
          endDate: '2026-07-10',
          status: 'doing',
          assigneeUserId: me,
          createdBy: 'other'
        },
        {
          taskId: 't2',
          groupId: 'g1',
          title: 'Done',
          endDate: '2026-07-10',
          status: 'done',
          assigneeUserId: me,
          createdBy: me
        },
        {
          taskId: 't3',
          groupId: 'g1',
          title: 'Other person',
          endDate: '2026-07-11',
          status: 'todo',
          assigneeUserId: 'u2',
          createdBy: 'u2'
        },
        {
          taskId: 't4',
          groupId: 'g1',
          title: 'Created by me today',
          endDate: '2026-07-11',
          status: 'todo',
          createdBy: me
        }
      ],
      me,
      '2026-07-11'
    )
    expect(list.map((x) => x.taskId)).toEqual(['t1', 't4'])
    expect(list[0]?.kind).toBe('overdue')
    expect(list[1]?.kind).toBe('today')
  })

  it('isRelevantDueTask and dedupe key', () => {
    expect(isRelevantDueTask({ assigneeUserId: 'a', createdBy: 'b' }, 'a')).toBe(true)
    expect(isRelevantDueTask({ createdBy: 'b' }, 'a')).toBe(false)
    expect(dueNotifyDedupeKey('t1', '2026-07-11')).toBe('t1:2026-07-11')
  })

  it('matchesAssigneeAlias and nudge draft', () => {
    expect(matchesAssigneeAlias('负责人')).toBe(true)
    expect(matchesAssigneeAlias('fzr')).toBe(true)
    expect(matchesAssigneeAlias('ass')).toBe(true)
    expect(matchesAssigneeAlias('bob')).toBe(false)
    expect(buildAssigneeNudgeDraft('Alice')).toBe('@Alice ')
  })
})

describe('orderMentionCandidates', () => {
  const members = [
    { userId: 'u1', displayName: 'Alice', mentionKeys: ['alice'] },
    { userId: 'u2', displayName: 'Bob', mentionKeys: ['bob'] },
    { userId: 'u3', displayName: 'Carol', mentionKeys: ['carol'] }
  ]

  it('pins assignee and alias filters to pin', () => {
    const ordered = orderMentionCandidates(members, '', { pinUserIds: ['u2'] })
    expect(ordered[0]?.userId).toBe('u2')
    const alias = orderMentionCandidates(members, '负责人', { pinUserIds: ['u2'] })
    expect(alias.map((m) => m.userId)).toEqual(['u2'])
  })
})
