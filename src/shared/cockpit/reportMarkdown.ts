import type { CockpitDashboard } from './types'
import { formatDeptForReport } from './constants'
import { taskDueNextIsoWeek } from './executiveSummary'
import type { TaskStatus } from '../task/types'

export type ReportTaskInput = {
  title: string
  groupId: string
  status: TaskStatus
  endDate?: string
  startDate?: string
  milestone?: boolean
  deletedAt?: string
}

export function formatReportTaskLine(task: {
  title: string
  projectName: string
  endDate?: string
}): string {
  const due = task.endDate ? `（截止 ${task.endDate}）` : ''
  return `- ${task.projectName} · ${task.title}${due}`
}

export function selectOpenTasksDueNextWeek<T extends ReportTaskInput>(
  tasks: readonly T[],
  refDate: Date = new Date()
): T[] {
  return tasks.filter(
    (t) =>
      !t.deletedAt && t.status !== 'done' && taskDueNextIsoWeek(t.endDate, refDate)
  )
}

function ymdInCalendarMonth(ymd: string | undefined, ref: Date): boolean {
  if (!ymd) return false
  const m = /^(\d{4})-(\d{2})/.exec(ymd.trim())
  if (!m) return false
  return Number(m[1]) === ref.getFullYear() && Number(m[2]) === ref.getMonth() + 1
}

/** Milestone tasks dated in the current calendar month (start or end). */
export function selectMilestonesThisMonth<T extends ReportTaskInput>(
  tasks: readonly T[],
  refDate: Date = new Date()
): T[] {
  return tasks.filter(
    (t) =>
      !t.deletedAt &&
      t.milestone === true &&
      (ymdInCalendarMonth(t.endDate, refDate) || ymdInCalendarMonth(t.startDate, refDate))
  )
}

function overviewLines(dash: CockpitDashboard, heading: string): string[] {
  return [
    heading,
    `- 项目总数：${dash.summary.totalProjects}`,
    `- 进行中任务：${dash.summary.inProgressCount}`,
    `- 风险项目：${dash.summary.riskProjectCount}`,
    `- 延期任务：${dash.summary.delayedCount}`
  ]
}

function projectProgressLines(dash: CockpitDashboard): string[] {
  return dash.projects.map(
    (p) =>
      `- **${p.name}**：${p.progressPercent}%（${p.status}，进行中 ${p.inProgressCount}，延期 ${p.delayedCount}）`
  )
}

function departmentLines(dash: CockpitDashboard): string[] {
  return dash.departments.map(
    (d) =>
      `- ${formatDeptForReport(d.department)}：${d.completionPercent}%（${d.doneCount}/${d.taskCount} 项完成）`
  )
}

export function buildWeeklyReportMarkdown(
  dash: CockpitDashboard,
  nextWeekLines: string[],
  generatedAt: string
): string {
  const plan =
    nextWeekLines.length > 0 ? nextWeekLines : ['- （暂无下周到期的未完成任务）']
  return [
    '# LanPM 周报',
    '',
    `生成时间：${generatedAt}`,
    '',
    ...overviewLines(dash, '## 概览'),
    '',
    '## 项目进度',
    ...projectProgressLines(dash),
    '',
    '## 部门完成率',
    ...departmentLines(dash),
    '',
    '## 下周计划',
    ...plan
  ].join('\n')
}

export function buildMonthlyReportMarkdown(
  dash: CockpitDashboard,
  milestoneLines: string[],
  riskLines: string[],
  generatedAt: string
): string {
  const milestones =
    milestoneLines.length > 0 ? milestoneLines : ['- （本月暂无里程碑）']
  const risks = riskLines.length > 0 ? riskLines : ['- （暂无风险/延期项目）']
  return [
    '# LanPM 月报',
    '',
    `生成时间：${generatedAt}`,
    '',
    ...overviewLines(dash, '## 本月概览'),
    '',
    '## 本月里程碑',
    ...milestones,
    '',
    '## 项目进度',
    ...projectProgressLines(dash),
    '',
    '## 风险汇总',
    ...risks
  ].join('\n')
}

export function projectRiskLines(dash: CockpitDashboard): string[] {
  return dash.projects
    .filter((p) => p.status === 'risk' || p.status === 'delayed')
    .map((p) => `- **${p.name}**：${p.status}（延期 ${p.delayedCount}）`)
}
