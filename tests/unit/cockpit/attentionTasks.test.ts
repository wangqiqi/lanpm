import { describe, expect, it } from 'vitest'
import {
  buildAttentionTasks,
  COCKPIT_ATTENTION_TASK_LIMIT
} from '../../../src/shared/cockpit/attentionTasks'

describe('buildAttentionTasks', () => {
  const ref = new Date('2026-07-14T12:00:00')

  it('returns overdue before behind and respects limit', () => {
    const tasks = buildAttentionTasks(
      [
        {
          taskId: 'b1',
          groupId: 'g1',
          projectName: 'P1',
          title: 'Behind task',
          status: 'doing',
          progressPercent: 10,
          startDate: '2026-07-01',
          endDate: '2026-07-20',
          createdAt: '2026-07-01',
          milestone: false
        },
        {
          taskId: 'o1',
          groupId: 'g1',
          projectName: 'P1',
          title: 'Overdue task',
          status: 'todo',
          progressPercent: 0,
          startDate: '2026-07-01',
          endDate: '2026-07-10',
          createdAt: '2026-07-01',
          milestone: false
        }
      ],
      COCKPIT_ATTENTION_TASK_LIMIT,
      ref
    )
    expect(tasks).toHaveLength(2)
    expect(tasks[0]?.kind).toBe('overdue')
    expect(tasks[1]?.kind).toBe('behind')
  })

  it('skips done and deleted tasks', () => {
    const tasks = buildAttentionTasks(
      [
        {
          taskId: 'd1',
          groupId: 'g1',
          projectName: 'P1',
          title: 'Done',
          status: 'done',
          progressPercent: 100,
          endDate: '2026-07-01',
          createdAt: '2026-07-01',
          deletedAt: undefined
        },
        {
          taskId: 'x1',
          groupId: 'g1',
          projectName: 'P1',
          title: 'Deleted overdue',
          status: 'todo',
          progressPercent: 0,
          endDate: '2026-07-01',
          createdAt: '2026-07-01',
          deletedAt: '2026-07-02'
        }
      ],
      8,
      ref
    )
    expect(tasks).toHaveLength(0)
  })

  it('includes assignee and project metadata', () => {
    const tasks = buildAttentionTasks(
      [
        {
          taskId: 'o2',
          groupId: 'g2',
          projectName: '演示群',
          title: '修复登录',
          status: 'doing',
          progressPercent: 5,
          startDate: '2026-07-01',
          endDate: '2026-07-05',
          createdAt: '2026-07-01',
          assigneeName: '张三'
        }
      ],
      8,
      ref
    )
    expect(tasks[0]).toMatchObject({
      projectName: '演示群',
      title: '修复登录',
      assigneeName: '张三',
      kind: 'overdue'
    })
  })
})
