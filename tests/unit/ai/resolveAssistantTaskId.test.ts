import { describe, expect, it } from 'vitest'
import { resolveAssistantTaskId } from '../../../src/shared/ai/resolveAssistantTaskId.ts'
import type { Task } from '../../../src/shared/task/types.ts'

const tasks: Task[] = [
  {
    taskId: 't1',
    groupId: 'g1',
    title: '上线准备',
    status: 'doing',
    progressPercent: 40,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01'
  },
  {
    taskId: 't2',
    groupId: 'g1',
    title: '文档整理',
    status: 'todo',
    progressPercent: 0,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01'
  }
]

describe('resolveAssistantTaskId', () => {
  it('uses context task id', () => {
    expect(resolveAssistantTaskId('t1', '', tasks)).toBe('t1')
  })

  it('uses single # ref', () => {
    expect(resolveAssistantTaskId(null, '请拆分 #上线准备', tasks)).toBe('t1')
  })

  it('returns null for ambiguous refs', () => {
    expect(resolveAssistantTaskId('t1', '对比 #上线准备 和 #文档整理', tasks)).toBeNull()
  })
})
