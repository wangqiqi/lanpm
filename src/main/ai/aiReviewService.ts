import type { Database } from 'better-sqlite3'
import type { AiStructuredReviewResult } from '../../shared/ai/types.ts'
import { isExternalAiAvailable } from './aiEndpointProbeService.ts'
import { getAiConfig, getDecryptedApiKey } from './aiConfigService.ts'
import { desensitizeTask, formatAiRuntimeContext } from './aiPromptService.ts'
import { getTaskScheduleHealth } from '../../shared/task/scheduleHealth.ts'
import { throwLanpm } from '../../shared/errors/lanpmError.ts'
import { listTasksByGroup } from '../storage/repositories/taskRepository.ts'

async function callExternalAiText(db: Database, prompt: string): Promise<string | null> {
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
      max_tokens: 600
    })
  })
  if (!res.ok) return null
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  return json.choices?.[0]?.message?.content ?? null
}

export async function reviewTaskStructured(
  db: Database,
  groupId: string,
  taskId: string
): Promise<AiStructuredReviewResult> {
  const payload = desensitizeTask(db, groupId, taskId)
  if (!payload) throwLanpm('stub.taskNotFound')

  const risks: string[] = []
  const task = listTasksByGroup(db, groupId).find((t) => t.taskId === taskId && !t.deletedAt)
  if (task && task.status !== 'done') {
    const health = getTaskScheduleHealth(task)
    if (health === 'overdue') risks.push('任务已过截止日期')
    if (health === 'behind') risks.push('进度落后于计划')
  }
  if (payload.progressPercent < 30 && payload.status === 'doing') {
    risks.push('进行中但完成度较低')
  }

  const localSummary = `任务「${payload.title}」状态 ${payload.status}，进度 ${payload.progressPercent}%`
  const suggestions =
    risks.length > 0
      ? ['拆分子任务并明确负责人', '更新截止日期或进度说明']
      : ['保持当前节奏', '可在验收清单中补充检查项']

  const ai = await callExternalAiText(
    db,
    `${formatAiRuntimeContext({ now: new Date() })}\n\n对以下脱敏任务做简短评审，输出 3 条以内建议（勿编造未提供的数据；时间判断以上述当前日期为准）：\n${JSON.stringify(payload)}`
  )

  return {
    summary: ai?.trim() || localSummary,
    risks,
    suggestions,
    usedExternalAi: Boolean(ai)
  }
}
