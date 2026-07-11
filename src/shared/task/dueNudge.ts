import type { Task, TaskStatus } from './types'

export type DueKind = 'today' | 'overdue'

/** 本地日历日 YYYY-MM-DD */
export function localYmd(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function classifyDue(
  endDate: string | undefined | null,
  todayYmd: string
): DueKind | null {
  const due = endDate?.trim()
  if (!due || !/^\d{4}-\d{2}-\d{2}$/.test(due)) return null
  if (due < todayYmd) return 'overdue'
  if (due === todayYmd) return 'today'
  return null
}

export function isOpenForDueNudge(status: TaskStatus, deletedAt?: string | null): boolean {
  if (deletedAt) return false
  return status !== 'done'
}

/** 指派给我或我创建 */
export function isRelevantDueTask(
  task: Pick<Task, 'assigneeUserId' | 'createdBy'>,
  userId: string
): boolean {
  return task.assigneeUserId === userId || task.createdBy === userId
}

export type DueNudgeCandidate = {
  taskId: string
  groupId: string
  title: string
  endDate: string
  kind: DueKind
}

export function selectDueNudgeTasks(
  tasks: ReadonlyArray<
    Pick<
      Task,
      | 'taskId'
      | 'groupId'
      | 'title'
      | 'endDate'
      | 'status'
      | 'deletedAt'
      | 'assigneeUserId'
      | 'createdBy'
    >
  >,
  userId: string,
  todayYmd: string
): DueNudgeCandidate[] {
  const out: DueNudgeCandidate[] = []
  for (const task of tasks) {
    if (!isOpenForDueNudge(task.status, task.deletedAt)) continue
    if (!isRelevantDueTask(task, userId)) continue
    const kind = classifyDue(task.endDate, todayYmd)
    if (!kind || !task.endDate) continue
    out.push({
      taskId: task.taskId,
      groupId: task.groupId,
      title: task.title,
      endDate: task.endDate,
      kind
    })
  }
  out.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'overdue' ? -1 : 1
    return a.endDate.localeCompare(b.endDate)
  })
  return out
}

/** 同任务同日只提醒一次 */
export function dueNotifyDedupeKey(taskId: string, todayYmd: string): string {
  return `${taskId}:${todayYmd}`
}

/** @负责人 语义查询（中/英/拼音首字母） */
export function matchesAssigneeAlias(query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return false
  return (
    q === '负责人' ||
    q === 'fuzeren' ||
    q === 'fzr' ||
    q === 'assignee' ||
    q === 'owner' ||
    '负责人'.includes(q) ||
    'fuzeren'.startsWith(q) ||
    'assignee'.startsWith(q)
  )
}

export function buildAssigneeNudgeDraft(displayName: string): string {
  const name = displayName.trim()
  if (!name) return '@'
  return `@${name} `
}
