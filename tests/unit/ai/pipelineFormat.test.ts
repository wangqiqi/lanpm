import { describe, expect, it } from 'vitest'
import { formatHealthCheckReportMarkdown } from '../../../src/shared/ai/pipelineFormat.ts'

describe('formatHealthCheckReportMarkdown', () => {
  it('renders health check heading and summary', () => {
    const md = formatHealthCheckReportMarkdown({
      groupName: 'Demo',
      startedAt: '2026-07-29T08:00:00.000Z',
      finishedAt: '2026-07-29T08:00:10.000Z',
      groupSummary: {
        groupName: 'Demo',
        totalTasks: 10,
        inProgressCount: 4,
        doneCount: 5,
        overdueCount: 1,
        behindCount: 1,
        attentionTasks: []
      },
      riskSummary: '整体可控，建议关注逾期任务。',
      taskReviews: [],
      usedExternalAi: true,
      degraded: false
    })
    expect(md).toContain('# 项目健康检查报告')
    expect(md).toContain('整体可控')
    expect(md).toContain('含外部 AI 分析')
  })
})
