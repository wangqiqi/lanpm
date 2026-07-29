import type { Database } from 'better-sqlite3'
import type { AiTaskAuditPayload } from '../../shared/cockpit/types.ts'
import { splitTaskRefSegments } from '../../shared/chat/taskRefs.ts'
import { listTasksByGroup } from '../storage/repositories/taskRepository.ts'
import type { Task } from '../../shared/task/types.ts'

const FORBIDDEN_PROMPT_MARKERS = ['chat_history', 'file_content', 'api_key', 'password'] as const

export function desensitizeTask(db: Database, groupId: string, taskId: string): AiTaskAuditPayload | null {
  const task = listTasksByGroup(db, groupId).find((t) => t.taskId === taskId && !t.deletedAt)
  if (!task) return null
  return taskToPayload(task)
}

function taskToPayload(t: Task): AiTaskAuditPayload {
  return {
    taskId: t.taskId,
    title: t.title,
    status: t.status,
    progressPercent: t.progressPercent,
    priority: t.priority,
    startDate: t.startDate,
    endDate: t.endDate,
    descriptionSummary: t.description ? t.description.slice(0, 80) : undefined
  }
}

export function resolveTaskIdsFromMessage(
  db: Database,
  groupId: string | null | undefined,
  text: string,
  explicitTaskIds: string[] = []
): string[] {
  const ids = new Set<string>(explicitTaskIds)
  if (!groupId) return [...ids]
  const tasks = listTasksByGroup(db, groupId).filter((t) => !t.deletedAt)
  for (const seg of splitTaskRefSegments(text, tasks)) {
    if (seg.kind === 'taskRef' && seg.taskId) ids.add(seg.taskId)
  }
  return [...ids]
}

export function buildDesensitizedTaskContext(
  db: Database,
  groupId: string | null | undefined,
  taskIds: string[]
): AiTaskAuditPayload[] {
  if (!groupId || taskIds.length === 0) return []
  const payloads: AiTaskAuditPayload[] = []
  for (const taskId of taskIds) {
    const p = desensitizeTask(db, groupId, taskId)
    if (p) payloads.push(p)
  }
  return payloads
}

export interface AssembledPrompt {
  system: string
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[]
}

export function assembleAiPrompt(input: {
  seedMarkdown?: string
  history: { role: 'user' | 'assistant' | 'system'; content: string }[]
  userMessage: string
  taskPayloads: AiTaskAuditPayload[]
}): AssembledPrompt {
  const taskBlock =
    input.taskPayloads.length > 0
      ? `\n\n相关任务（脱敏摘要）：\n${JSON.stringify(input.taskPayloads, null, 2)}`
      : ''
  const seedBlock = input.seedMarkdown?.trim()
    ? `\n\n上下文报告：\n${input.seedMarkdown.trim()}`
    : ''
  const system = [
    '你是 LanPM 项目协作助手。仅基于提供的脱敏任务摘要与对话回答问题。',
    '禁止编造未提供的聊天全文、文件内容或凭据。',
    '回答使用简体中文，条理清晰。'
  ].join('\n')

  const messages = [
    ...input.history.filter((m) => m.role === 'user' || m.role === 'assistant'),
    {
      role: 'user' as const,
      content: `${input.userMessage.trim()}${taskBlock}${seedBlock}`
    }
  ]

  for (const marker of FORBIDDEN_PROMPT_MARKERS) {
    const blob = JSON.stringify({ system, messages })
    if (blob.toLowerCase().includes(marker)) {
      throw new Error(`desensitize violation: ${marker}`)
    }
  }

  return { system, messages }
}

export function assertPromptDesensitized(prompt: AssembledPrompt): void {
  const blob = JSON.stringify(prompt).toLowerCase()
  for (const marker of FORBIDDEN_PROMPT_MARKERS) {
    if (blob.includes(marker)) {
      throw new Error(`desensitize violation: ${marker}`)
    }
  }
}
