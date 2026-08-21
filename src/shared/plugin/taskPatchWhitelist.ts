/** Extension API v0.3 — `task.patch` 允许字段（SSOT） */
export const TASK_PATCH_WHITELIST_FIELDS = [
  'title',
  'status',
  'progressPercent',
  'priority',
  'tags',
  'storyPoints'
] as const

export type TaskPatchWhitelistField = (typeof TASK_PATCH_WHITELIST_FIELDS)[number]

const WHITELIST_SET = new Set<string>(TASK_PATCH_WHITELIST_FIELDS)

export function getDisallowedTaskPatchFields(patch: Record<string, unknown>): string[] {
  return Object.keys(patch).filter((key) => !WHITELIST_SET.has(key))
}
