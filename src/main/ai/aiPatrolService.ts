import type { Database } from 'better-sqlite3'
import type { AiPatrolFinding, AiPatrolReport, AiPatrolRunSummary } from '../../shared/ai/patrolTypes.ts'
import { buildGroupAiSummary, formatAiGroupSummary, formatAiRuntimeContext } from './aiPromptService.ts'
import { getAiConfig, getDecryptedApiKey } from './aiConfigService.ts'
import { isExternalAiAvailable } from './aiEndpointProbeService.ts'
import { listUserGroups, resolveGroupType } from '../group/groupService.ts'
import { buildAttentionTasks } from '../../shared/cockpit/attentionTasks.ts'
import { listTasksByGroup } from '../storage/repositories/taskRepository.ts'
import { getUserById } from '../storage/repositories/userRepository.ts'
import { getTaskScheduleHealth } from '../../shared/task/scheduleHealth.ts'
import { randomUUID } from 'crypto'

const PATROL_ATTENTION_LIMIT = 8

function groupAllowsTasks(db: Database, groupId: string): boolean {
  const type = resolveGroupType(db, groupId)
  return type !== 'anonymous' && type !== 'function' && !groupId.startsWith('dm:')
}

async function callExternalPatrolSummary(db: Database, prompt: string): Promise<string | null> {
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
      max_tokens: 400
    })
  })
  if (!res.ok) return null
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  return json.choices?.[0]?.message?.content?.trim() ?? null
}

function buildRuleSummary(findings: AiPatrolFinding[]): string {
  if (findings.length === 0) return '巡检完成：暂无逾期、落后或需关注任务。'
  const overdue = findings.filter((f) => f.kind === 'overdue').length
  const behind = findings.filter((f) => f.kind === 'behind').length
  const attention = findings.filter((f) => f.kind === 'attention').length
  const parts: string[] = []
  if (overdue) parts.push(`${overdue} 项逾期`)
  if (behind) parts.push(`${behind} 项落后`)
  if (attention) parts.push(`${attention} 项需关注`)
  return `巡检发现：${parts.join('、')}。请打开驾驶舱或任务看板处理。`
}

export function scanPatrolFindings(db: Database, refDate: Date = new Date()): AiPatrolFinding[] {
  const findings: AiPatrolFinding[] = []

  for (const group of listUserGroups(db)) {
    if (!groupAllowsTasks(db, group.groupId)) continue
    const tasks = listTasksByGroup(db, group.groupId).filter((t) => !t.deletedAt)
    const open = tasks.filter((t) => t.status !== 'done')

    for (const task of open) {
      const health = getTaskScheduleHealth(task, refDate)
      if (health === 'overdue') {
        findings.push({
          groupId: group.groupId,
          groupName: group.name,
          taskId: task.taskId,
          title: task.title,
          kind: 'overdue',
          assigneeName: task.assigneeUserId
            ? getUserById(db, task.assigneeUserId)?.displayName
            : undefined,
          endDate: task.endDate,
          progressPercent: task.progressPercent
        })
      } else if (health === 'behind') {
        findings.push({
          groupId: group.groupId,
          groupName: group.name,
          taskId: task.taskId,
          title: task.title,
          kind: 'behind',
          assigneeName: task.assigneeUserId
            ? getUserById(db, task.assigneeUserId)?.displayName
            : undefined,
          endDate: task.endDate,
          progressPercent: task.progressPercent
        })
      }
    }

    const attention = buildAttentionTasks(
      open.map((t) => ({
        ...t,
        projectName: group.name,
        assigneeName: t.assigneeUserId
          ? getUserById(db, t.assigneeUserId)?.displayName
          : undefined
      })),
      PATROL_ATTENTION_LIMIT,
      refDate
    )
    for (const a of attention) {
      if (findings.some((f) => f.taskId === a.taskId)) continue
      const task = open.find((t) => t.taskId === a.taskId)
      findings.push({
        groupId: group.groupId,
        groupName: group.name,
        taskId: a.taskId,
        title: a.title,
        kind: 'attention',
        assigneeName: a.assigneeName,
        endDate: a.endDate,
        progressPercent: task?.progressPercent
      })
    }
  }

  return findings.slice(0, 50)
}

export async function runAiPatrol(db: Database): Promise<AiPatrolReport> {
  const startedAt = new Date()
  const findings = scanPatrolFindings(db, startedAt)
  const ruleSummary = buildRuleSummary(findings)

  const summaries = listUserGroups(db)
    .filter((g) => groupAllowsTasks(db, g.groupId))
    .map((g) => formatAiGroupSummary(buildGroupAiSummary(db, g.groupId, g.name, startedAt)))
    .join('\n\n')

  const aiPrompt = `${formatAiRuntimeContext({ now: startedAt })}

以下是各项目脱敏 KPI 摘要与规则巡检发现（${findings.length} 项）。请用 2–4 句中文总结风险与建议，勿编造数据：

${summaries}

发现任务：
${findings.map((f) => `- [${f.kind}] ${f.groupName} / ${f.title}`).join('\n') || '无'}`

  const aiText = await callExternalPatrolSummary(db, aiPrompt)
  const finishedAt = new Date()

  return {
    runId: `patrol_${randomUUID()}`,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    findings,
    summary: aiText ?? ruleSummary,
    usedExternalAi: Boolean(aiText)
  }
}
