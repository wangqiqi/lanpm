import { describe, expect, it } from 'vitest'
import { formatPatrolSeedMarkdown } from '../../../src/shared/ai/patrolFormat.ts'

describe('formatPatrolSeedMarkdown', () => {
  it('formats empty findings', () => {
    const md = formatPatrolSeedMarkdown({
      startedAt: '2026-07-29T08:00:00.000Z',
      finishedAt: '2026-07-29T08:00:05.000Z',
      summary: '巡检完成：暂无逾期、落后或需关注任务。',
      findings: [],
      usedExternalAi: false
    })
    expect(md).toContain('## 摘要')
    expect(md).toContain('暂无逾期')
    expect(md).toContain('（无逾期、落后或需关注任务）')
  })

  it('formats findings table', () => {
    const md = formatPatrolSeedMarkdown({
      startedAt: '2026-07-29T08:00:00.000Z',
      finishedAt: '2026-07-29T08:00:05.000Z',
      summary: '巡检发现：1 项逾期。',
      usedExternalAi: true,
      findings: [
        {
          groupId: 'g1',
          groupName: 'Demo',
          taskId: 't1',
          title: '上线准备',
          kind: 'overdue',
          assigneeName: 'Alice',
          endDate: '2026-07-20',
          progressPercent: 40
        }
      ]
    })
    expect(md).toContain('| 逾期 | Demo | 上线准备 | Alice |')
    expect(md).toContain('外部 AI 摘要')
  })
})
