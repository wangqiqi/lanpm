import type { AiStreamChatInput } from '../ai/types.ts'

/** Extension API v0.6 — `ai.streamChat` allowed fields (plugin subset) */
export const AI_STREAM_CHAT_WHITELIST_FIELDS = [
  'userMessage',
  'threadId',
  'groupId',
  'taskIds',
  'createThreadTitle'
] as const

export type AiStreamChatWhitelistField = (typeof AI_STREAM_CHAT_WHITELIST_FIELDS)[number]

const WHITELIST_SET = new Set<string>(AI_STREAM_CHAT_WHITELIST_FIELDS)

export const AI_STREAM_CHAT_MAX_MESSAGE_LENGTH = 16_384

export function getDisallowedAiStreamChatFields(input: Record<string, unknown>): string[] {
  return Object.keys(input).filter((key) => !WHITELIST_SET.has(key))
}

export type ParsedAiStreamChatCapability =
  | { ok: true; value: Pick<AiStreamChatInput, 'userMessage' | 'threadId' | 'groupId' | 'taskIds' | 'createThreadTitle'> }
  | { ok: false; message: string }

export function parseAiStreamChatCapabilityInput(input: unknown): ParsedAiStreamChatCapability {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, message: 'streamChat input object required' }
  }
  const body = input as Record<string, unknown>
  const disallowed = getDisallowedAiStreamChatFields(body)
  if (disallowed.length > 0) {
    return { ok: false, message: `streamChat field not allowed: ${disallowed.join(', ')}` }
  }
  const userMessage = body.userMessage
  if (typeof userMessage !== 'string' || !userMessage.trim()) {
    return { ok: false, message: 'userMessage required' }
  }
  const trimmed = userMessage.trim()
  if (trimmed.length > AI_STREAM_CHAT_MAX_MESSAGE_LENGTH) {
    return { ok: false, message: 'userMessage too long' }
  }
  let threadId: string | undefined
  if (body.threadId !== undefined) {
    if (typeof body.threadId !== 'string' || !body.threadId.trim()) {
      return { ok: false, message: 'invalid threadId' }
    }
    threadId = body.threadId.trim()
  }
  let groupId: string | null | undefined
  if (body.groupId !== undefined) {
    if (body.groupId === null) {
      groupId = null
    } else if (typeof body.groupId === 'string') {
      groupId = body.groupId.trim() || null
    } else {
      return { ok: false, message: 'invalid groupId' }
    }
  }
  let taskIds: string[] | undefined
  if (body.taskIds !== undefined) {
    if (!Array.isArray(body.taskIds)) {
      return { ok: false, message: 'taskIds must be an array' }
    }
    taskIds = body.taskIds.map((id) => String(id)).filter((id) => id.length > 0)
  }
  let createThreadTitle: string | undefined
  if (body.createThreadTitle !== undefined) {
    if (typeof body.createThreadTitle !== 'string' || !body.createThreadTitle.trim()) {
      return { ok: false, message: 'invalid createThreadTitle' }
    }
    createThreadTitle = body.createThreadTitle.trim()
  }
  return {
    ok: true,
    value: {
      userMessage: trimmed,
      ...(threadId ? { threadId } : {}),
      ...(groupId !== undefined ? { groupId } : {}),
      ...(taskIds ? { taskIds } : {}),
      ...(createThreadTitle ? { createThreadTitle } : {})
    }
  }
}
