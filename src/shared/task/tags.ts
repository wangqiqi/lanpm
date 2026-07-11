/**
 * Board independent tags (DOC-F-02 / TASK-171).
 * Multi-tag string[] alongside priority — normalize before persist/UI.
 * SPRINT-FORCE-DICT-TAGS: persist only tags present in group_tag_meta (see filterTagsToGroupDict).
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

/** Dict entry shape for force-filter (tagKey + optional display label). */
export type GroupDictTagLike = {
  tagKey: string
  label?: string
}

/**
 * Keep only tags that exist in the group dictionary.
 * Empty dict → []; matching uses case-insensitive key; output uses dict label casing.
 */
export function filterTagsToGroupDict(
  tags: unknown,
  dict: readonly GroupDictTagLike[]
): string[] {
  const normalized = normalizeTaskTags(tags)
  if (dict.length === 0) return []

  const byKey = new Map<string, string>()
  for (const d of dict) {
    if (typeof d.tagKey !== 'string') continue
    const key = taskTagKey(d.tagKey)
    if (!key) continue
    const labelRaw =
      typeof d.label === 'string' && d.label.trim() ? d.label.trim() : d.tagKey.trim()
    const label = labelRaw.slice(0, TASK_TAG_MAX_LENGTH) || key
    if (!byKey.has(key)) byKey.set(key, label)
  }
  if (byKey.size === 0) return []

  const out: string[] = []
  const seen = new Set<string>()
  for (const tag of normalized) {
    const key = taskTagKey(tag)
    const canonical = byKey.get(key)
    if (!canonical || seen.has(key)) continue
    seen.add(key)
    out.push(canonical)
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

/** Case-insensitive tag key for maps / filter matching. */
export function taskTagKey(tag: string): string {
  return tag.trim().toLowerCase()
}

type TaggedTask = { tags?: string[] | null }

/**
 * OR filter: keep tasks that have at least one selected tag (case-insensitive).
 * Empty / all-invalid selection → return all tasks unchanged.
 */
export function filterTasksByTags<T extends TaggedTask>(
  tasks: T[],
  selectedTags: readonly string[]
): T[] {
  const keys = new Set(
    selectedTags
      .map((t) => (typeof t === 'string' ? taskTagKey(t) : ''))
      .filter((k) => k.length > 0)
  )
  if (keys.size === 0) return tasks

  return tasks.filter((task) => {
    const tags = task.tags
    if (!tags || tags.length === 0) return false
    return tags.some((t) => keys.has(taskTagKey(t)))
  })
}

/**
 * Unique tags across tasks (first-seen casing), sorted by locale-insensitive key.
 */
export function collectUniqueTaskTags(tasks: readonly TaggedTask[]): string[] {
  const byKey = new Map<string, string>()
  for (const task of tasks) {
    for (const raw of task.tags ?? []) {
      if (typeof raw !== 'string') continue
      const tag = raw.trim()
      if (!tag) continue
      const key = taskTagKey(tag)
      if (!byKey.has(key)) byKey.set(key, tag)
    }
  }
  return [...byKey.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, label]) => label)
}

/**
 * Stable HSL background for a tag label (hash of case-insensitive key).
 * Returns CSS color string suitable for chip backgrounds.
 */
export function tagColorHash(tag: string): string {
  const key = taskTagKey(tag)
  let h = 0
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) >>> 0
  }
  const hue = h % 360
  return `hsl(${hue} 42% 42%)`
}

/**
 * Resolve chip color: optional override map (by tag key) else hash default.
 */
export function resolveTagColor(
  tag: string,
  overrides?: Readonly<Record<string, string>> | null
): string {
  const key = taskTagKey(tag)
  const override = overrides?.[key] ?? overrides?.[tag]
  if (typeof override === 'string' && /^#[0-9A-Fa-f]{6}$/.test(override.trim())) {
    return override.trim()
  }
  if (typeof override === 'string' && override.trim().startsWith('hsl(')) {
    return override.trim()
  }
  return tagColorHash(tag)
}
