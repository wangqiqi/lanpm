import type { Task } from '../task/types'

const TASK_REF_TRIGGER = /(?:^|\s)#([^#\n]*)$/

export function extractTaskRefQuery(draft: string): string | null {
  const match = TASK_REF_TRIGGER.exec(draft)
  return match ? match[1]! : null
}

function activeTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => !t.deletedAt)
}

/** 英文分词首字母；中文/单段标题用去空格全文作检索键 */
export function buildTaskSearchKeys(title: string): string[] {
  const lower = title.toLowerCase()
  const keys = new Set<string>([lower, lower.replace(/\s+/g, '')])
  const words = lower.split(/[\s\-_/]+/).filter(Boolean)
  if (words.length > 1) {
    keys.add(words.map((w) => w[0] ?? '').join(''))
  }
  return [...keys]
}

export function taskMatchesQuery(task: Task, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  if (task.taskId.toLowerCase().includes(q)) return true
  return buildTaskSearchKeys(task.title).some(
    (key) => key.includes(q) || key.startsWith(q)
  )
}

export function filterTasksByQuery(tasks: Task[], query: string, limit = 20): Task[] {
  const list = activeTasks(tasks)
  const q = query.trim()
  if (!q) return list.slice(0, limit)
  return list.filter((t) => taskMatchesQuery(t, q)).slice(0, limit)
}

export function resolveTaskByTitleToken(token: string, tasks: Task[]): Task | undefined {
  const trimmed = token.trim()
  if (!trimmed) return undefined
  const lower = trimmed.toLowerCase()
  const list = activeTasks(tasks)
  const exact = list.find((t) => t.title.toLowerCase() === lower)
  if (exact) return exact
  const prefixMatches = list.filter((t) => t.title.toLowerCase().startsWith(lower))
  if (prefixMatches.length === 1) return prefixMatches[0]
  if (prefixMatches.length > 1) {
    return [...prefixMatches].sort((a, b) => a.title.length - b.title.length)[0]
  }
  return undefined
}

function matchTaskRefAt(
  text: string,
  hashIndex: number,
  tasks: Task[]
): { task: Task; length: number } | null {
  const rest = text.slice(hashIndex + 1)
  const list = activeTasks(tasks).sort((a, b) => b.title.length - a.title.length)
  for (const task of list) {
    if (!rest.toLowerCase().startsWith(task.title.toLowerCase())) continue
    const after = rest[task.title.length]
    if (after !== undefined && !/[\s.,，。!?！？、；;:]/.test(after)) continue
    return { task, length: task.title.length }
  }
  return null
}

/** 整条消息仅为 #任务名 时，发送 task_ref 卡片 */
export function parseStandaloneTaskRef(text: string, tasks: Task[]): Task | null {
  const trimmed = text.trim()
  if (!trimmed.startsWith('#')) return null
  const hashIndex = trimmed.indexOf('#')
  const matched = matchTaskRefAt(trimmed, hashIndex, tasks)
  if (!matched) return null
  const remainder = trimmed.slice(hashIndex + 1 + matched.length).trim()
  if (remainder.length > 0) return null
  return matched.task
}

/** 发送前解析：优先标题匹配，其次用户从联想列表点选的任务 id */
export function resolveStandaloneTaskRefForSend(
  text: string,
  tasks: Task[],
  pickedTaskId?: string | null
): Task | null {
  const parsed = parseStandaloneTaskRef(text, tasks)
  if (parsed) return parsed
  if (!pickedTaskId) return null
  const picked = activeTasks(tasks).find((t) => t.taskId === pickedTaskId)
  if (!picked) return null
  const trimmed = text.trim()
  if (trimmed === `#${picked.title}`) return picked
  return null
}

export interface TaskRefSegment {
  kind: 'text' | 'taskRef'
  value: string
  taskId?: string
}

/** 将普通文本拆分为 #任务 片段（用于消息内联高亮） */
export function splitTaskRefSegments(text: string, tasks: Task[]): TaskRefSegment[] {
  const segments: TaskRefSegment[] = []
  let i = 0
  while (i < text.length) {
    const hashIdx = text.indexOf('#', i)
    if (hashIdx < 0) {
      segments.push({ kind: 'text', value: text.slice(i) })
      break
    }
    if (hashIdx > i) {
      segments.push({ kind: 'text', value: text.slice(i, hashIdx) })
    }
    const matched = matchTaskRefAt(text, hashIdx, tasks)
    if (matched) {
      segments.push({
        kind: 'taskRef',
        value: `#${matched.task.title}`,
        taskId: matched.task.taskId
      })
      i = hashIdx + 1 + matched.length
    } else {
      segments.push({ kind: 'text', value: '#' })
      i = hashIdx + 1
    }
  }
  return segments.length ? segments : [{ kind: 'text', value: text }]
}

/**
 * Resolve task id from composer `#` ref when attaching/sending a file (optional link).
 * Uses picked suggest id first, then title token at end of draft.
 */
export function resolveComposerTaskLink(
  draft: string,
  tasks: Task[],
  pickedTaskId?: string | null
): string | undefined {
  const query = extractTaskRefQuery(draft)
  if (query === null) return undefined
  if (pickedTaskId) {
    const picked = activeTasks(tasks).find((t) => t.taskId === pickedTaskId)
    if (picked) return picked.taskId
  }
  return resolveTaskByTitleToken(query, tasks)?.taskId
}

/** @ 与 # 同时存在时，取更靠近输入末尾的触发器 */
export function activeComposerSuggest(
  draft: string,
  taskEnabled: boolean
): 'mention' | 'task' | null {
  const atMatch = /(?:^|\s)@([^\s@]*)$/.exec(draft)
  const hashMatch = taskEnabled ? /(?:^|\s)#([^#\n]*)$/.exec(draft) : null
  if (!atMatch && !hashMatch) return null
  if (!atMatch) return 'task'
  if (!hashMatch) return 'mention'
  return (atMatch.index ?? 0) >= (hashMatch.index ?? 0) ? 'mention' : 'task'
}
