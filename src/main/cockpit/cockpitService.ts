import type { Database } from 'better-sqlite3'
import type {
  AiReportResult,
  AiTaskAuditPayload,
  CockpitDashboard,
  ProjectDashboardItem,
  ProjectHealth
} from '../../shared/cockpit/types'
import { COCKPIT_UNASSIGNED_DEPT, formatDeptForReport } from '../../shared/cockpit/constants'
import { countRiskProjects, sortCockpitProjects } from '../../shared/cockpit/sortProjects'
import { buildExecutiveSummary } from '../../shared/cockpit/executiveSummary'
import { buildAttentionTasks } from '../../shared/cockpit/attentionTasks'
import { buildWeeklyTrend } from '../../shared/cockpit/weeklyTrend'
import { countScheduleHealth, getTaskScheduleHealth } from '../../shared/task/scheduleHealth'
import type { Task } from '../../shared/task/types'
import { listProjectGroups } from '../storage/repositories/groupRepository'
import { listProjectTasksWithAssigneeMeta, listTasksByGroup } from '../storage/repositories/taskRepository'
import { getAiConfig, getDecryptedApiKey } from '../ai/aiConfigService'
import { isExternalAiAvailable } from '../ai/aiEndpointProbeService'
import { assertPaidPluginLicensed } from '../plugin/licenseStore.ts'

function projectHealthFromTasks(open: Task[]): ProjectHealth {
  if (open.some((t) => getTaskScheduleHealth(t) === 'overdue')) return 'delayed'
  if (open.some((t) => getTaskScheduleHealth(t) === 'behind')) return 'risk'
  return 'normal'
}

function aggregateProject(tasks: Task[]): Omit<ProjectDashboardItem, 'groupId' | 'name'> {
  const active = tasks.filter((t) => !t.deletedAt)
  const open = active.filter((t) => t.status !== 'done')
  const inProgressCount = open.filter((t) => t.status === 'doing' || t.status === 'todo').length
  const { overdue: delayedCount } = countScheduleHealth(open)
  const progressPercent =
    active.length === 0
      ? 0
      : Math.round(active.reduce((sum, t) => sum + t.progressPercent, 0) / active.length)

  const status = projectHealthFromTasks(open)

  return {
    progressPercent,
    status,
    inProgressCount,
    delayedCount,
    totalTasks: active.length
  }
}

export function buildCockpitDashboard(db: Database): CockpitDashboard {
  const projectGroups = listProjectGroups(db)
  const allTasks = listProjectTasksWithAssigneeMeta(db)
  const tasksByGroup = new Map<string, typeof allTasks>()
  for (const task of allTasks) {
    const bucket = tasksByGroup.get(task.groupId)
    if (bucket) bucket.push(task)
    else tasksByGroup.set(task.groupId, [task])
  }

  const projects = sortCockpitProjects(
    projectGroups.map((g) => ({
      groupId: g.groupId,
      name: g.name,
      ...aggregateProject(tasksByGroup.get(g.groupId) ?? [])
    }))
  )

  const deptMap = new Map<string, { done: number; total: number }>()
  for (const task of allTasks) {
    const dept = task.assigneeDepartment || COCKPIT_UNASSIGNED_DEPT
    const bucket = deptMap.get(dept) ?? { done: 0, total: 0 }
    bucket.total += 1
    if (task.status === 'done') bucket.done += 1
    deptMap.set(dept, bucket)
  }

  const departments = [...deptMap.entries()]
    .map(([department, { done, total }]) => ({
      department,
      taskCount: total,
      doneCount: done,
      completionPercent: total === 0 ? 0 : Math.round((done / total) * 100)
    }))
    .sort((a, b) => {
      if (a.department === COCKPIT_UNASSIGNED_DEPT) return 1
      if (b.department === COCKPIT_UNASSIGNED_DEPT) return -1
      return b.completionPercent - a.completionPercent || b.taskCount - a.taskCount
    })

  const summary = {
    totalProjects: projects.length,
    inProgressCount: projects.reduce((n, p) => n + p.inProgressCount, 0),
    delayedCount: projects.reduce((n, p) => n + p.delayedCount, 0),
    riskProjectCount: countRiskProjects(projects)
  }

  const executiveSummary = buildExecutiveSummary(allTasks, summary.riskProjectCount)
  const weeklyTrend = buildWeeklyTrend(allTasks)

  const groupName = new Map(projectGroups.map((g) => [g.groupId, g.name]))
  const attentionTasks = buildAttentionTasks(
    allTasks.map((task) => ({
      taskId: task.taskId,
      groupId: task.groupId,
      title: task.title,
      startDate: task.startDate,
      endDate: task.endDate,
      progressPercent: task.progressPercent,
      status: task.status,
      milestone: task.milestone,
      createdAt: task.createdAt,
      deletedAt: task.deletedAt,
      projectName: groupName.get(task.groupId) ?? task.groupId,
      assigneeName: task.assigneeDisplayName
    }))
  )

  return { summary, executiveSummary, weeklyTrend, attentionTasks, projects, departments }
}

function desensitizeTasks(db: Database, groupId: string): AiTaskAuditPayload[] {
  return listTasksByGroup(db, groupId)
    .filter((t) => !t.deletedAt)
    .map((t) => ({
      taskId: t.taskId,
      title: t.title,
      status: t.status,
      progressPercent: t.progressPercent,
      priority: t.priority,
      startDate: t.startDate,
      endDate: t.endDate,
      descriptionSummary: t.description ? t.description.slice(0, 80) : undefined
    }))
}

function localWeeklyMarkdown(db: Database): string {
  const dash = buildCockpitDashboard(db)
  const lines = [
    '# LanPM 周报',
    '',
    `生成时间：${new Date().toISOString()}`,
    '',
    '## 概览',
    `- 项目总数：${dash.summary.totalProjects}`,
    `- 进行中任务：${dash.summary.inProgressCount}`,
    `- 风险项目：${dash.summary.riskProjectCount}`,
    `- 延期任务：${dash.summary.delayedCount}`,
    '',
    '## 项目进度',
    ...dash.projects.map(
      (p) =>
        `- **${p.name}**：${p.progressPercent}%（${p.status}，进行中 ${p.inProgressCount}，延期 ${p.delayedCount}）`
    ),
    '',
    '## 部门完成率',
    ...dash.departments.map(
      (d) =>
        `- ${formatDeptForReport(d.department)}：${d.completionPercent}%（${d.doneCount}/${d.taskCount} 项完成）`
    )
  ]
  return lines.join('\n')
}

function localMonthlyMarkdown(db: Database): string {
  const weekly = localWeeklyMarkdown(db)
  return weekly.replace('# LanPM 周报', '# LanPM 月报').replace('## 概览', '## 本月概览')
}

async function callExternalAi(db: Database, prompt: string): Promise<string | null> {
  if (!isExternalAiAvailable(db)) return null
  const config = getAiConfig(db)!
  const apiKey = getDecryptedApiKey(db)
  if (!apiKey) return null

  const url = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800
    })
  })
  if (!res.ok) return null
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  return json.choices?.[0]?.message?.content ?? null
}

export async function generateWeeklyReport(db: Database): Promise<AiReportResult> {
  assertPaidPluginLicensed('lanpm.weekly', 'paid')
  const local = localWeeklyMarkdown(db)
  const ai = await callExternalAi(
    db,
    `基于以下脱敏项目摘要生成简短周报建议（勿编造未提供的数据）：\n${local}`
  )
  return {
    format: 'markdown',
    content: ai ? `${local}\n\n## AI 建议\n\n${ai}` : local,
    generatedAt: new Date().toISOString(),
    usedExternalAi: Boolean(ai)
  }
}

export async function generateMonthlyReport(db: Database): Promise<AiReportResult> {
  assertPaidPluginLicensed('lanpm.weekly', 'paid')
  const local = localMonthlyMarkdown(db)
  const ai = await callExternalAi(
    db,
    `基于以下脱敏月报摘要生成风险与改进建议：\n${local}`
  )
  return {
    format: 'markdown',
    content: ai ? `${local}\n\n## AI 建议\n\n${ai}` : local,
    generatedAt: new Date().toISOString(),
    usedExternalAi: Boolean(ai)
  }
}

export async function evaluateProjects(db: Database): Promise<AiReportResult> {
  const dash = buildCockpitDashboard(db)
  const payloads = dash.projects.flatMap((p) => desensitizeTasks(db, p.groupId))
  const summary = payloads
    .slice(0, 20)
    .map((t) => `- ${t.title} (${t.status}, ${t.progressPercent}%)`)
    .join('\n')

  const local = [
    '# 项目 AI 评估（脱敏）',
    '',
    `评估时间：${new Date().toISOString()}`,
    '',
    '## 任务摘要',
    summary || '（暂无任务）',
    '',
    '## 本地规则评估',
    ...dash.projects.map((p) => {
      const hint =
        p.status === 'delayed'
          ? '存在已过截止日的任务，建议优先处理'
          : p.status === 'risk'
            ? '存在进度落后于工期的任务，需关注'
            : '进度正常'
      return `- ${p.name}：${hint}`
    })
  ].join('\n')

  const ai = await callExternalAi(
    db,
    `请对以下脱敏任务列表做简短进度评估（禁止引用聊天或文件内容）：\n${summary}`
  )

  return {
    format: 'markdown',
    content: ai ? `${local}\n\n## 外部 AI 评估\n\n${ai}` : local,
    generatedAt: new Date().toISOString(),
    usedExternalAi: Boolean(ai)
  }
}
