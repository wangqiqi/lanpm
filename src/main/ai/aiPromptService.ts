import type { Database } from 'better-sqlite3'
import type { AiEntrySource } from '../../shared/ai/types.ts'
import type { AiGroupSummary, AiTaskAuditPayload } from '../../shared/cockpit/types.ts'
import { buildAttentionTasks } from '../../shared/cockpit/attentionTasks.ts'
import { splitTaskRefSegments } from '../../shared/chat/taskRefs.ts'
import {
  countScheduleHealth,
  getTaskScheduleHealth,
  resolveTaskScheduleWindow
} from '../../shared/task/scheduleHealth.ts'
import { checklistProgressOf } from '../../shared/task/checklist.ts'
import type { Task } from '../../shared/task/types.ts'
import { listChecklistItemsByTaskId } from '../storage/repositories/checklistRepository.ts'
import { listTasksByGroup } from '../storage/repositories/taskRepository.ts'
import { getUserById } from '../storage/repositories/userRepository.ts'

const FORBIDDEN_PROMPT_MARKERS = ['chat_history', 'file_content', 'api_key', 'password'] as const
const GROUP_AI_ATTENTION_LIMIT = 5
const CHECKLIST_ITEM_LIMIT = 12

function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}

function startOfDay(d: Date): Date {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  return out
}

function daysUntilDeadline(
  task: Pick<Task, 'startDate' | 'endDate' | 'status' | 'milestone' | 'createdAt'>,
  refDate: Date
): number | undefined {
  if (task.status === 'done') return undefined
  const window = resolveTaskScheduleWindow(task)
  if (!window) return undefined
  const end = parseYmd(window.endDate)
  const today = startOfDay(refDate)
  const a = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  const b = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate())
  return Math.floor((b - a) / 86_400_000)
}

function taskToPayload(
  db: Database,
  tasks: Task[],
  task: Task,
  refDate: Date
): AiTaskAuditPayload {
  const parent = task.parentTaskId
    ? tasks.find((t) => t.taskId === task.parentTaskId && !t.deletedAt)
    : undefined
  const assigneeName = task.assigneeUserId
    ? getUserById(db, task.assigneeUserId)?.displayName
    : undefined
  const checklistItems = listChecklistItemsByTaskId(db, task.taskId)
    .slice(0, CHECKLIST_ITEM_LIMIT)
    .map((item) => ({ text: item.text, done: item.done }))
  const checklistProgress = checklistProgressOf(checklistItems)

  return {
    taskId: task.taskId,
    title: task.title,
    status: task.status,
    progressPercent: task.progressPercent,
    priority: task.priority,
    startDate: task.startDate,
    endDate: task.endDate,
    descriptionSummary: task.description ? task.description.slice(0, 80) : undefined,
    scheduleHealth: getTaskScheduleHealth(task, refDate),
    daysUntilDeadline: daysUntilDeadline(task, refDate),
    assigneeName,
    milestone: task.milestone,
    parentTitle: parent?.title,
    tags: task.tags?.length ? [...task.tags] : undefined,
    checklistProgress: checklistProgress.total > 0 ? checklistProgress : undefined,
    checklistItems: checklistItems.length > 0 ? checklistItems : undefined
  }
}

export function desensitizeTask(
  db: Database,
  groupId: string,
  taskId: string,
  refDate: Date = new Date()
): AiTaskAuditPayload | null {
  const tasks = listTasksByGroup(db, groupId).filter((t) => !t.deletedAt)
  const task = tasks.find((t) => t.taskId === taskId)
  if (!task) return null
  return taskToPayload(db, tasks, task, refDate)
}

export function resolveTaskIdsFromMessage(
  db: Database,
  groupId: string | null | undefined,
  text: string,
  explicitTaskIds: string[] = [],
  contextTaskId?: string | null
): string[] {
  const ids = new Set<string>(explicitTaskIds)
  if (contextTaskId) ids.add(contextTaskId)
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
  taskIds: string[],
  refDate: Date = new Date()
): AiTaskAuditPayload[] {
  if (!groupId || taskIds.length === 0) return []
  const payloads: AiTaskAuditPayload[] = []
  for (const taskId of taskIds) {
    const p = desensitizeTask(db, groupId, taskId, refDate)
    if (p) payloads.push(p)
  }
  return payloads
}

export function buildGroupAiSummary(
  db: Database,
  groupId: string,
  groupName: string,
  refDate: Date = new Date()
): AiGroupSummary {
  const tasks = listTasksByGroup(db, groupId).filter((t) => !t.deletedAt)
  const open = tasks.filter((t) => t.status !== 'done')
  const doneCount = tasks.filter((t) => t.status === 'done').length
  const inProgressCount = open.filter((t) => t.status === 'doing' || t.status === 'todo').length
  const { overdue: overdueCount, behind: behindCount } = countScheduleHealth(open, refDate)

  const attentionTasks = buildAttentionTasks(
    open.map((t) => ({
      ...t,
      projectName: groupName,
      assigneeName: t.assigneeUserId ? getUserById(db, t.assigneeUserId)?.displayName : undefined
    })),
    GROUP_AI_ATTENTION_LIMIT,
    refDate
  ).map((a) => {
    const task = open.find((t) => t.taskId === a.taskId)
    return {
      title: a.title,
      kind: a.kind,
      progressPercent: task?.progressPercent ?? 0,
      assigneeName: a.assigneeName,
      endDate: a.endDate
    }
  })

  return {
    groupName,
    totalTasks: tasks.length,
    inProgressCount,
    doneCount,
    overdueCount,
    behindCount,
    attentionTasks
  }
}

export interface AiRuntimeContext {
  now?: Date
  timeZone?: string
  locale?: string
  groupName?: string | null
  currentUserDisplayName?: string | null
  networkOnline?: boolean
  entrySource?: AiEntrySource
  appView?: string | null
}

export function formatAiRuntimeContext(input: AiRuntimeContext = {}): string {
  const now = input.now ?? new Date()
  const locale = input.locale ?? 'zh-CN'
  let timeZone = input.timeZone
  if (!timeZone) {
    try {
      timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    } catch {
      timeZone = 'UTC'
    }
  }
  const dateTimeFmt = new Intl.DateTimeFormat(locale, {
    dateStyle: 'full',
    timeStyle: 'medium',
    timeZone
  })
  const weekdayFmt = new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone })
  const lines = [
    `当前日期时间：${dateTimeFmt.format(now)}（${weekdayFmt.format(now)}）`,
    `时区：${timeZone}`,
    `ISO 8601：${now.toISOString()}`
  ]
  if (input.groupName) {
    lines.push(`当前群/项目：${input.groupName}`)
  }
  if (input.currentUserDisplayName) {
    lines.push(`当前用户：${input.currentUserDisplayName}`)
  }
  if (input.entrySource) {
    lines.push(`打开入口：${input.entrySource}`)
  }
  if (input.appView) {
    lines.push(`当前视图：${input.appView}`)
  }
  if (input.locale) {
    lines.push(`界面语言：${input.locale}`)
  }
  if (input.networkOnline !== undefined) {
    lines.push(`网络状态：${input.networkOnline ? '在线' : '离线'}`)
  }
  return lines.join('\n')
}

export function formatAiGroupSummary(summary: AiGroupSummary): string {
  const lines = [
    `群/项目：${summary.groupName}`,
    `任务总数：${summary.totalTasks}（进行中 ${summary.inProgressCount}，已完成 ${summary.doneCount}）`,
    `排期风险：逾期 ${summary.overdueCount}，进度落后 ${summary.behindCount}`
  ]
  if (summary.attentionTasks.length > 0) {
    lines.push('需关注任务（脱敏 Top）：')
    for (const t of summary.attentionTasks) {
      const who = t.assigneeName ? ` · ${t.assigneeName}` : ''
      const due = t.endDate ? ` · 截止 ${t.endDate}` : ''
      lines.push(
        `- [${t.kind === 'overdue' ? '逾期' : '落后'}] ${t.title}（${t.progressPercent}%${who}${due}）`
      )
    }
  }
  return lines.join('\n')
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
  runtime?: AiRuntimeContext
  groupSummary?: AiGroupSummary | null
}): AssembledPrompt {
  const taskBlock =
    input.taskPayloads.length > 0
      ? `\n\n相关任务（脱敏摘要）：\n${JSON.stringify(input.taskPayloads, null, 2)}`
      : ''
  const seedBlock = input.seedMarkdown?.trim()
    ? `\n\n上下文报告：\n${input.seedMarkdown.trim()}`
    : ''
  const runtimeBlock = `\n\n【系统自动注入的运行时上下文】\n${formatAiRuntimeContext(input.runtime)}`
  const groupBlock = input.groupSummary
    ? `\n\n【当前群/项目概况（脱敏）】\n${formatAiGroupSummary(input.groupSummary)}`
    : ''
  const replyLang = input.runtime?.locale?.toLowerCase().startsWith('en') ? 'English' : '简体中文'
  const system = [
    '你是 LanPM 项目协作助手。仅基于提供的脱敏任务摘要、群概况、运行时上下文与对话回答问题。',
    '涉及「今天」「当前」「还剩几天」「是否逾期」等时间判断时，必须以系统注入的当前日期时间为准；勿声称无法获取日期或实时环境。',
    '禁止编造未提供的聊天全文、文件内容或凭据。',
    `回答使用${replyLang}，条理清晰。`,
    runtimeBlock + groupBlock
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
