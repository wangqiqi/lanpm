import type { AiStructuredReviewResult } from './types.ts'
import type { AiGroupSummary } from '../cockpit/types.ts'

export interface HealthCheckReportInput {
  groupName: string
  startedAt: string
  finishedAt: string
  groupSummary: AiGroupSummary
  riskSummary: string
  taskReviews: {
    taskId: string
    title: string
    review: AiStructuredReviewResult
  }[]
  usedExternalAi: boolean
  degraded: boolean
}

/** Markdown report for health-check pipeline (assistant seed / cockpit display). */
export function formatHealthCheckReportMarkdown(input: HealthCheckReportInput): string {
  const lines: string[] = [
    '# 项目健康检查报告',
    '',
    `- 项目：${input.groupName}`,
    `- 时间：${input.startedAt} → ${input.finishedAt}`,
    `- 来源：${input.usedExternalAi ? '含外部 AI 分析' : '本地规则'}`,
    input.degraded ? '- 状态：部分步骤已降级' : '',
    '',
    '## 概况',
    '',
    `- 任务总数：${input.groupSummary.totalTasks}（进行中 ${input.groupSummary.inProgressCount}，已完成 ${input.groupSummary.doneCount}）`,
    `- 排期风险：逾期 ${input.groupSummary.overdueCount}，进度落后 ${input.groupSummary.behindCount}`,
    '',
    '## 风险摘要',
    '',
    input.riskSummary.trim(),
    ''
  ]

  if (input.taskReviews.length > 0) {
    lines.push('## 重点关注任务评审', '')
    for (const item of input.taskReviews) {
      lines.push(`### ${item.title}`, '')
      lines.push(item.review.summary)
      if (item.review.risks.length) {
        lines.push('', '**风险：**', ...item.review.risks.map((r) => `- ${r}`))
      }
      if (item.review.suggestions.length) {
        lines.push('', '**建议：**', ...item.review.suggestions.map((s) => `- ${s}`))
      }
      lines.push('')
    }
  } else if (input.groupSummary.attentionTasks.length > 0) {
    lines.push('## 需关注任务', '')
    for (const t of input.groupSummary.attentionTasks) {
      const who = t.assigneeName ? ` · ${t.assigneeName}` : ''
      const due = t.endDate ? ` · 截止 ${t.endDate}` : ''
      lines.push(
        `- [${t.kind === 'overdue' ? '逾期' : '落后'}] ${t.title}（${t.progressPercent}%${who}${due}）`
      )
    }
    lines.push('')
  }

  return lines.filter((line) => line !== undefined).join('\n')
}
