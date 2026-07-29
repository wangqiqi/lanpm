import { describe, expect, it } from 'vitest'
import {
  assembleAiPrompt,
  assertPromptDesensitized,
  buildGroupAiSummary,
  formatAiGroupSummary,
  formatAiRuntimeContext,
  resolveTaskIdsFromMessage
} from '../../../src/main/ai/aiPromptService.ts'

describe('aiPromptService desensitize', () => {
  it('assembles prompt without forbidden markers', () => {
    const prompt = assembleAiPrompt({
      history: [],
      userMessage: '请评审 #登录模块',
      taskPayloads: [
        {
          taskId: 't1',
          title: '登录模块',
          status: 'doing',
          progressPercent: 40,
          priority: 'high',
          startDate: '2026-01-01',
          endDate: '2026-02-01',
          descriptionSummary: '实现 OAuth',
          scheduleHealth: 'behind',
          daysUntilDeadline: -3
        }
      ],
      groupSummary: {
        groupName: '示例项目群',
        totalTasks: 10,
        inProgressCount: 4,
        doneCount: 3,
        overdueCount: 1,
        behindCount: 2,
        attentionTasks: [
          {
            title: '登录模块',
            kind: 'overdue',
            progressPercent: 40,
            assigneeName: '张三',
            endDate: '2026-02-01'
          }
        ]
      },
      runtime: {
        now: new Date('2026-07-29T14:30:00+08:00'),
        timeZone: 'Asia/Shanghai',
        groupName: '示例项目群',
        currentUserDisplayName: '李四',
        entrySource: 'task-detail',
        appView: 'board',
        locale: 'zh-CN',
        networkOnline: true
      }
    })
    assertPromptDesensitized(prompt)
    expect(prompt.messages[0]?.content).toContain('登录模块')
    expect(JSON.stringify(prompt)).not.toContain('chat_history')
    expect(prompt.system).toContain('系统自动注入的运行时上下文')
    expect(prompt.system).toContain('当前群/项目概况')
    expect(prompt.system).toContain('2026')
    expect(prompt.system).toContain('示例项目群')
    expect(prompt.system).toContain('李四')
    expect(prompt.system).toContain('逾期')
  })

  it('formatAiRuntimeContext includes ISO and timezone', () => {
    const block = formatAiRuntimeContext({
      now: new Date('2026-07-29T06:30:00.000Z'),
      timeZone: 'Asia/Shanghai',
      locale: 'zh-CN',
      currentUserDisplayName: '测试用户',
      entrySource: 'topbar',
      networkOnline: false
    })
    expect(block).toContain('ISO 8601')
    expect(block).toContain('Asia/Shanghai')
    expect(block).toContain('2026')
    expect(block).toContain('测试用户')
    expect(block).toContain('离线')
  })

  it('formatAiGroupSummary renders attention tasks', () => {
    const text = formatAiGroupSummary({
      groupName: 'A 项目',
      totalTasks: 5,
      inProgressCount: 2,
      doneCount: 1,
      overdueCount: 1,
      behindCount: 0,
      attentionTasks: [
        { title: '联调', kind: 'overdue', progressPercent: 20, endDate: '2026-07-20' }
      ]
    })
    expect(text).toContain('A 项目')
    expect(text).toContain('联调')
    expect(text).toContain('逾期')
  })

  it('resolveTaskIdsFromMessage merges context task id', () => {
    const ids = resolveTaskIdsFromMessage(null, null, '你好', [], 'task-ctx-1')
    expect(ids).toEqual(['task-ctx-1'])
  })
})

describe('buildGroupAiSummary', () => {
  it('is exported for stream service', () => {
    expect(typeof buildGroupAiSummary).toBe('function')
  })
})
