import type { CreateTaskInput, TaskPriority, TaskStatus } from '../task/types.ts'

/** Extension API v0.4 — `task.create` allowed fields (safe subset of CreateTaskInput) */
export const TASK_CREATE_WHITELIST_FIELDS = [
  'groupId',
  'title',
  'status',
  'priority',
  'tags'
] as const

export type TaskCreateWhitelistField = (typeof TASK_CREATE_WHITELIST_FIELDS)[number]

const WHITELIST_SET = new Set<string>(TASK_CREATE_WHITELIST_FIELDS)

const STATUSES = new Set<string>(['todo', 'doing', 'done', 'other'])
const PRIORITIES = new Set<string>(['low', 'medium', 'high'])

export function getDisallowedTaskCreateFields(input: Record<string, unknown>): string[] {
  return Object.keys(input).filter((key) => !WHITELIST_SET.has(key))
}

export type ParsedTaskCreate =
  | { ok: true; value: Pick<CreateTaskInput, 'groupId' | 'title' | 'status' | 'priority' | 'tags'> }
  | { ok: false; message: string }

export function parseTaskCreateInput(input: unknown): ParsedTaskCreate {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, message: 'create input object required' }
  }
  const body = input as Record<string, unknown>
  const disallowed = getDisallowedTaskCreateFields(body)
  if (disallowed.length > 0) {
    return { ok: false, message: `create field not allowed: ${disallowed.join(', ')}` }
  }
  const groupId = body.groupId
  const title = body.title
  if (typeof groupId !== 'string' || !groupId.trim()) {
    return { ok: false, message: 'groupId required' }
  }
  if (typeof title !== 'string' || !title.trim()) {
    return { ok: false, message: 'title required' }
  }
  let status: TaskStatus | undefined
  if (body.status !== undefined) {
    if (typeof body.status !== 'string' || !STATUSES.has(body.status)) {
      return { ok: false, message: 'invalid status' }
    }
    status = body.status as TaskStatus
  }
  let priority: TaskPriority | undefined
  if (body.priority !== undefined) {
    if (typeof body.priority !== 'string' || !PRIORITIES.has(body.priority)) {
      return { ok: false, message: 'invalid priority' }
    }
    priority = body.priority as TaskPriority
  }
  let tags: string[] | undefined
  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags) || !body.tags.every((t) => typeof t === 'string')) {
      return { ok: false, message: 'tags must be string[]' }
    }
    tags = body.tags as string[]
  }
  return {
    ok: true,
    value: {
      groupId: groupId.trim(),
      title: title.trim(),
      status,
      priority,
      tags
    }
  }
}
