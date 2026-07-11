/**
 * Board independent tags (DOC-F-02 / TASK-171).
 * Multi-tag string[] alongside priority — normalize before persist/UI.
 */

/** Max Unicode code units per single tag after trim. */
export const TASK_TAG_MAX_LENGTH = 32

/** Max tags per task after normalize. */
export const TASK_TAGS_MAX_COUNT = 8

/**
 * Trim, drop empties, case-insensitive dedupe (keep first casing),
 * enforce per-tag length and max count.
 */
export function normalizeTaskTags(input: unknown): string[] {
  if (!Array.isArray(input)) return []

  const seen = new Set<string>()
  const out: string[] = []

  for (const raw of input) {
    if (typeof raw !== 'string') continue
    const tag = raw.trim()
    if (!tag) continue
    if (tag.length > TASK_TAG_MAX_LENGTH) continue
    const key = tag.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(tag)
    if (out.length >= TASK_TAGS_MAX_COUNT) break
  }

  return out
}

/** True if a single string is a valid tag candidate (before list normalize). */
export function isValidTaskTag(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const tag = value.trim()
  return tag.length > 0 && tag.length <= TASK_TAG_MAX_LENGTH
}
