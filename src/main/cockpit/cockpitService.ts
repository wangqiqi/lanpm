import type { Database } from 'better-sqlite3'
import type {
  AiReportResult,
  AiTaskAuditPayload,
  CockpitDashboard,
  ProjectDashboardItem,
  ProjectHealth
} from '../../shared/cockpit/types'
import { countRiskProjects, sortCockpitProjects } from '../../shared/cockpit/sortProjects'
import { buildExecutiveSummary } from '../../shared/cockpit/executiveSummary'
import { buildAttentionTasks } from '../../shared/cockpit/attentionTasks'
import { countScheduleHealth, getTaskScheduleHealth } from '../../shared/task/scheduleHealth'
import type { Task } from '../../shared/task/types'
import { listProjectGroups } from '../storage/repositories/groupRepository'
import { listTasksByGroup } from '../storage/repositories/taskRepository'
import { getUserById } from '../storage/repositories/userRepository'
import { getAiConfig, getDecryptedApiKey } from '../ai/aiConfigService'

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
  const projects = sortCockpitProjects(
    listProjectGroups(db).map((g) => {
      const tasks = listTasksByGroup(db, g.groupId)
      return {
        groupId: g.groupId,
        name: g.name,
        ...aggregateProject(tasks)
      }
    })
  )

  const deptMap = new Map<string, { done: number; total: number }>()
  for (const project of listProjectGroups(db)) {
    for (const task of listTasksByGroup(db, project.groupId)) {
      if (task.deletedAt) continue
      const user = task.assigneeUserId ? getUserById(db, task.assigneeUserId) : null
      const dept = user?.department?.trim() || '未分配'
      const bucket = deptMap.get(dept) ?? { done: 0, total: 0 }
      bucket.total += 1
      if (task.status === 'done') bucket.done += 1
      deptMap.set(dept, bucket)
    }
  }

  const departments = [...deptMap.entries()]
    .map(([department, { done, total }]) => ({
      department,
      taskCount: total,
      completionPercent: total === 0 ? 0 : Math.round((done / total) * 100)
    }))
    .sort((a, b) => b.completionPercent - a.completionPercent)

  const summary = {
    totalProjects: projects.length,
    inProgressCount: projects.reduce((n, p) => n + p.inProgressCount, 0),
    delayedCount: projects.reduce((n, p) => n + p.delayedCount, 0),
    riskProjectCount: countRiskProjects(projects)
  }

  const projectGroups = listProjectGroups(db)
  const allTasks = projectGroups.flatMap((g) => listTasksByGroup(db, g.groupId))
  const executiveSummary = buildExecutiveSummary(allTasks, summary.riskProjectCount)

  const attentionTasks = buildAttentionTasks(
    projectGroups.flatMap((g) =>
      listTasksByGroup(db, g.groupId).map((task) => ({
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
        projectName: g.name,
        assigneeName: task.assigneeUserId
          ? getUserById(db, task.assigneeUserId)?.displayName
          : undefined
      }))
    )
  )

  return { summary, executiveSummary, attentionTasks, projects, departments }
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
    ...dash.departments.map((d) => `- ${d.department}：${d.completionPercent}%（${d.taskCount} 项任务）`)
  ]
  return lines.join('\n')
}

function localMonthlyMarkdown(db: Database): string {
  const weekly = localWeeklyMarkdown(db)
  return weekly.replace('# LanPM 周报', '# LanPM 月报').replace('## 概览', '## 本月概览')
}

async function callExternalAi(db: Database, prompt: string): Promise<string | null> {
  const config = getAiConfig(db)
  if (!config?.enabled) return null
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
