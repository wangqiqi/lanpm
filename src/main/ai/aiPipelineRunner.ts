import type { Database } from 'better-sqlite3'
import { randomUUID } from 'crypto'
import { buildAttentionTasks } from '../../shared/cockpit/attentionTasks.ts'
import type { AiGroupSummary } from '../../shared/cockpit/types.ts'
import { formatHealthCheckReportMarkdown } from '../../shared/ai/pipelineFormat.ts'
import { getPipelinePreset } from '../../shared/ai/pipelinePresets.ts'
import type {
  AiPipelinePresetId,
  AiPipelineRun,
  AiPipelineStepResult,
  AiPipelineStepStatus,
  AiStartPipelineInput
} from '../../shared/ai/pipelineTypes.ts'
import type { AiStructuredReviewResult } from '../../shared/ai/types.ts'
import { throwLanpm } from '../../shared/errors/lanpmError.ts'
import { getGroupById } from '../storage/repositories/groupRepository.ts'
import { listTasksByGroup } from '../storage/repositories/taskRepository.ts'
import { getUserById } from '../storage/repositories/userRepository.ts'
import { isExternalAiAvailable } from './aiEndpointProbeService.ts'
import { getAiConfig, getDecryptedApiKey } from './aiConfigService.ts'
import { insertPipelineRun, updatePipelineRun } from './aiPipelineRepository.ts'
import {
  buildGroupAiSummary,
  formatAiGroupSummary,
  formatAiRuntimeContext
} from './aiPromptService.ts'
import { reviewTaskStructured } from './aiReviewService.ts'

interface HealthCheckBag {
  groupName: string
  groupSummary: AiGroupSummary
  riskSummary: string
  taskReviews: { taskId: string; title: string; review: AiStructuredReviewResult }[]
}

async function callExternalRiskSummary(db: Database, prompt: string): Promise<string | null> {
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
      max_tokens: 700
    })
  })
  if (!res.ok) return null
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  return json.choices?.[0]?.message?.content?.trim() ?? null
}

function buildRuleRiskSummary(summary: AiGroupSummary): string {
  if (summary.attentionTasks.length === 0) {
    return '当前项目整体健康：暂无逾期或进度明显落后的任务。建议保持节奏并定期更新任务进度。'
  }
  const parts: string[] = [
    `发现 ${summary.overdueCount} 项逾期、${summary.behindCount} 项进度落后。`,
    '建议优先处理以下需关注任务，并同步负责人与截止日期。'
  ]
  return parts.join('')
}

function stepResult(
  stepId: AiPipelineStepResult['stepId'],
  status: AiPipelineStepStatus,
  startedAt: string,
  summary?: string,
  errorCode?: string
): AiPipelineStepResult {
  return {
    stepId,
    status,
    startedAt,
    finishedAt: new Date().toISOString(),
    summary,
    errorCode
  }
}

async function runHealthCheckPipeline(
  db: Database,
  userId: string,
  groupId: string
): Promise<AiPipelineRun> {
  const group = getGroupById(db, groupId)
  if (!group) throwLanpm('err.groupNotFound')

  const preset = getPipelinePreset('healthCheck')
  const runId = `pipe_${randomUUID()}`
  const startedAt = new Date().toISOString()
  const run: AiPipelineRun = {
    runId,
    userId,
    groupId,
    presetId: 'healthCheck',
    status: 'running',
    startedAt,
    finishedAt: null,
    steps: [],
    finalMarkdown: null,
    usedExternalAi: false,
    degraded: false
  }
  insertPipelineRun(db, run)

  const bag: HealthCheckBag = {
    groupName: group.name,
    groupSummary: buildGroupAiSummary(db, groupId, group.name),
    riskSummary: '',
    taskReviews: []
  }

  for (const stepDef of preset.steps) {
    const stepStarted = new Date().toISOString()
    try {
      if (stepDef.stepId === 'gatherContext') {
        run.steps.push(
          stepResult('gatherContext', 'ok', stepStarted, `已汇总 ${bag.groupSummary.totalTasks} 项任务`)
        )
      } else if (stepDef.stepId === 'llmRiskSummary') {
        const prompt = `${formatAiRuntimeContext({ now: new Date() })}\n\n请基于以下脱敏项目概况，用 3–5 句话总结当前主要风险与建议（勿编造未提供的数据）：\n\n${formatAiGroupSummary(bag.groupSummary)}`
        const aiText = await callExternalRiskSummary(db, prompt)
        if (aiText) {
          bag.riskSummary = aiText
          run.usedExternalAi = true
          run.steps.push(stepResult('llmRiskSummary', 'ok', stepStarted, '已生成 AI 风险摘要'))
        } else {
          bag.riskSummary = buildRuleRiskSummary(bag.groupSummary)
          run.degraded = true
          run.steps.push(
            stepResult('llmRiskSummary', 'degraded', stepStarted, '外呼不可用，已使用本地规则摘要')
          )
        }
      } else if (stepDef.stepId === 'reviewTopTasks') {
        const tasks = listTasksByGroup(db, groupId).filter((t) => !t.deletedAt)
        const open = tasks.filter((t) => t.status !== 'done')
        const attention = buildAttentionTasks(
          open.map((t) => ({
            ...t,
            projectName: group.name,
            assigneeName: t.assigneeUserId
              ? getUserById(db, t.assigneeUserId)?.displayName
              : undefined
          })),
          3
        )
        for (const item of attention) {
          const review = await reviewTaskStructured(db, groupId, item.taskId)
          if (review.usedExternalAi) run.usedExternalAi = true
          bag.taskReviews.push({ taskId: item.taskId, title: item.title, review })
        }
        run.steps.push(
          stepResult(
            'reviewTopTasks',
            attention.length === 0 ? 'ok' : 'ok',
            stepStarted,
            attention.length
              ? `已评审 ${attention.length} 项重点关注任务`
              : '无需评审的重点关注任务'
          )
        )
      } else if (stepDef.stepId === 'assembleReport') {
        const finishedAt = new Date().toISOString()
        run.finalMarkdown = formatHealthCheckReportMarkdown({
          groupName: bag.groupName,
          startedAt: run.startedAt,
          finishedAt,
          groupSummary: bag.groupSummary,
          riskSummary: bag.riskSummary,
          taskReviews: bag.taskReviews,
          usedExternalAi: run.usedExternalAi,
          degraded: run.degraded
        })
        run.finishedAt = finishedAt
        run.status = 'completed'
        run.steps.push(stepResult('assembleReport', 'ok', stepStarted, '报告已生成'))
      }
    } catch {
      run.degraded = true
      run.steps.push(
        stepResult(stepDef.stepId, 'failed', stepStarted, undefined, 'step_failed')
      )
      if (stepDef.stepId === 'assembleReport') {
        run.status = 'failed'
        run.finishedAt = new Date().toISOString()
      }
    }
    updatePipelineRun(db, run)
  }

  if (run.status === 'running') {
    run.status = 'completed'
    run.finishedAt = new Date().toISOString()
    updatePipelineRun(db, run)
  }

  return run
}

export async function startAiPipeline(
  db: Database,
  userId: string,
  input: AiStartPipelineInput
): Promise<AiPipelineRun> {
  if (input.presetId === 'healthCheck') {
    return runHealthCheckPipeline(db, userId, input.groupId)
  }
  throw new Error(`Unsupported pipeline preset: ${String(input.presetId)}`)
}

export async function runHealthCheckPipelineForVerify(
  db: Database,
  userId: string,
  groupId: string
): Promise<AiPipelineRun> {
  return runHealthCheckPipeline(db, userId, groupId)
}
