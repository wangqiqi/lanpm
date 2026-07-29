import type { AiPatrolFinding, AiPatrolReport } from './patrolTypes.ts'

const KIND_LABEL: Record<AiPatrolFinding['kind'], string> = {
  overdue: '逾期',
  behind: '落后',
  attention: '需关注'
}

export type PatrolSeedSource = Pick<
  AiPatrolReport,
  'summary' | 'findings' | 'startedAt' | 'finishedAt' | 'usedExternalAi'
>

/** Markdown seed for assistant continuation from a patrol report. */
export function formatPatrolSeedMarkdown(report: PatrolSeedSource): string {
  const lines: string[] = [
    '# 定时巡检报告',
    '',
    `- 时间：${report.startedAt} → ${report.finishedAt}`,
    `- 来源：${report.usedExternalAi ? '外部 AI 摘要' : '本地规则'}`,
    '',
    '## 摘要',
    '',
    report.summary.trim(),
    ''
  ]

  lines.push('## 发现项', '')
  if (report.findings.length === 0) {
    lines.push('（无逾期、落后或需关注任务）')
    return lines.join('\n')
  }

  lines.push('| 类型 | 项目 | 任务 | 负责人 | 截止 | 进度 |')
  lines.push('| --- | --- | --- | --- | --- | --- |')
  for (const finding of report.findings) {
    const progress =
      finding.progressPercent !== undefined ? `${finding.progressPercent}%` : '—'
    lines.push(
      `| ${KIND_LABEL[finding.kind]} | ${finding.groupName} | ${finding.title} | ${finding.assigneeName ?? '—'} | ${finding.endDate ?? '—'} | ${progress} |`
    )
  }

  return lines.join('\n')
}
