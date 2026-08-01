/** Extension API v0.6 — `ai.getThread` allowed fields */
export const AI_GET_THREAD_WHITELIST_FIELDS = ['threadId'] as const

const WHITELIST_SET = new Set<string>(AI_GET_THREAD_WHITELIST_FIELDS)

export function getDisallowedAiGetThreadFields(input: Record<string, unknown>): string[] {
  return Object.keys(input).filter((key) => !WHITELIST_SET.has(key))
}

export type ParsedAiGetThread =
  | { ok: true; value: { threadId: string } }
  | { ok: false; message: string }

export function parseAiGetThreadInput(input: unknown): ParsedAiGetThread {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, message: 'getThread input object required' }
  }
  const body = input as Record<string, unknown>
  const disallowed = getDisallowedAiGetThreadFields(body)
  if (disallowed.length > 0) {
    return { ok: false, message: `getThread field not allowed: ${disallowed.join(', ')}` }
  }
  const threadId = body.threadId
  if (typeof threadId !== 'string' || !threadId.trim()) {
    return { ok: false, message: 'threadId required' }
  }
  return { ok: true, value: { threadId: threadId.trim() } }
}
