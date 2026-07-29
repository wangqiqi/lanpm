import type { Database } from 'better-sqlite3'
import type {
  AiConfirmSubtasksInput,
  AiConfirmSubtasksResult,
  AiProposeSubtasksInput,
  AiProposeSubtasksResult,
  AiSubtaskProposal
} from '../../shared/ai/subtaskSchemas.ts'
import { parseAiSubtaskLlmJson } from '../../shared/ai/subtaskSchemas.ts'
import { getAiConfig, getDecryptedApiKey } from './aiConfigService.ts'
import { desensitizeTask, formatAiRuntimeContext } from './aiPromptService.ts'
import { throwLanpm } from '../../shared/errors/lanpmError.ts'
import { listActiveChildTasks } from '../storage/repositories/taskRepository.ts'
import { listGroupMembers } from '../storage/repositories/groupRepository.ts'
import { getGroupById } from '../storage/repositories/groupRepository.ts'
import { createGroupTask, updateGroupTask } from '../task/taskService.ts'
import { getUserById } from '../storage/repositories/userRepository.ts'

function buildMemberHints(db: Database, groupId: string): { userId: string; displayName: string }[] {
  return listGroupMembers(db, groupId).map((m) => ({
    userId: m.userId,
    displayName: getUserById(db, m.userId)?.displayName ?? m.userId
  }))
}

async function callExternalSubtaskJson(
  db: Database,
  prompt: string
): Promise<string | null> {
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
      max_tokens: 1200,
      response_format: { type: 'json_object' }
    })
  })
  if (!res.ok) return null
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  return json.choices?.[0]?.message?.content ?? null
}

function fallbackProposals(parentTitle: string): AiSubtaskProposal[] {
  return [
    { title: `${parentTitle} — 需求澄清`, rationale: '本地规则降级' },
    { title: `${parentTitle} — 实施`, rationale: '本地规则降级' },
    { title: `${parentTitle} — 验收`, rationale: '本地规则降级' }
  ]
}

export async function proposeSubtasks(
  db: Database,
  input: AiProposeSubtasksInput
): Promise<AiProposeSubtasksResult> {
  const payload = desensitizeTask(db, input.groupId, input.parentTaskId)
  if (!payload) {
    return { proposals: [], usedExternalAi: false, errorCode: 'task_not_found' }
  }

  const config = getAiConfig(db)
  if (!config?.enabled) {
    return {
      proposals: fallbackProposals(payload.title),
      usedExternalAi: false,
      errorCode: 'ai_disabled'
    }
  }
  const apiKey = getDecryptedApiKey(db)
  if (!apiKey) {
    return {
      proposals: fallbackProposals(payload.title),
      usedExternalAi: false,
      errorCode: 'no_api_key'
    }
  }

  const children = listActiveChildTasks(db, input.groupId, input.parentTaskId)
  const members = buildMemberHints(db, input.groupId)
  const group = getGroupById(db, input.groupId)

  const prompt = `${formatAiRuntimeContext({ now: new Date(), groupName: group?.name ?? input.groupId })}

你是项目管理助手。根据以下脱敏父任务，提出 3–8 条可执行的子任务草案。
输出严格 JSON：{"subtasks":[{"title":"...","suggestedAssigneeUserId":"可选 userId","suggestedEndDate":"YYYY-MM-DD 可选","rationale":"可选"}]}
规则：
- 仅使用下方成员 userId 作为 suggestedAssigneeUserId（可省略）
- 勿编造未提供的数据
- 标题简洁可执行

父任务：
${JSON.stringify(payload)}

已有子任务（${children.length}）：
${children.map((c) => c.title).join('；') || '无'}

可选成员：
${members.map((m) => `${m.displayName} (${m.userId})`).join('\n')}`

  const raw = await callExternalSubtaskJson(db, prompt)
  if (!raw) {
    return {
      proposals: fallbackProposals(payload.title),
      usedExternalAi: false,
      errorCode: 'external_failed'
    }
  }

  try {
    const proposals = parseAiSubtaskLlmJson(raw)
    if (proposals.length === 0) {
      return {
        proposals: fallbackProposals(payload.title),
        usedExternalAi: true,
        errorCode: 'parse_failed'
      }
    }
    const memberIds = new Set(members.map((m) => m.userId))
    const sanitized = proposals.map((p) => ({
      ...p,
      suggestedAssigneeUserId:
        p.suggestedAssigneeUserId && memberIds.has(p.suggestedAssigneeUserId)
          ? p.suggestedAssigneeUserId
          : undefined
    }))
    return { proposals: sanitized, usedExternalAi: true }
  } catch {
    return {
      proposals: fallbackProposals(payload.title),
      usedExternalAi: true,
      errorCode: 'parse_failed'
    }
  }
}

export function confirmSubtasks(
  db: Database,
  input: AiConfirmSubtasksInput
): AiConfirmSubtasksResult {
  const parent = desensitizeTask(db, input.groupId, input.parentTaskId)
  if (!parent) throwLanpm('stub.taskNotFound')

  const createdTaskIds: string[] = []
  for (const item of input.items) {
    const title = item.title.trim()
    if (!title) continue
    const task = createGroupTask(db, {
      groupId: input.groupId,
      title,
      parentTaskId: input.parentTaskId,
      status: 'todo',
      assigneeUserId: item.assigneeUserId
    })
    if (item.endDate) {
      updateGroupTask(db, { taskId: task.taskId, endDate: item.endDate })
    }
    createdTaskIds.push(task.taskId)
  }
  return { createdTaskIds }
}
