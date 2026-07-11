/** Max linked file ids per task (A2). */
export const TASK_LINKED_FILES_MAX = 50

/** Normalize / dedupe file id list for Task.linkedFileIds. */
export function normalizeLinkedFileIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    if (typeof item !== 'string') continue
    const id = item.trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(id)
    if (out.length >= TASK_LINKED_FILES_MAX) break
  }
  return out
}
