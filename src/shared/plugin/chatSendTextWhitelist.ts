/** Extension API v0.5 — `chat.sendText` allowed fields */
export const CHAT_SEND_TEXT_WHITELIST_FIELDS = ['groupId', 'text', 'replyToMsgId'] as const

export type ChatSendTextWhitelistField = (typeof CHAT_SEND_TEXT_WHITELIST_FIELDS)[number]

const WHITELIST_SET = new Set<string>(CHAT_SEND_TEXT_WHITELIST_FIELDS)

/** Reasonable upper bound aligned with chat composer (chars). */
export const CHAT_SEND_TEXT_MAX_LENGTH = 16_384

export function getDisallowedChatSendTextFields(input: Record<string, unknown>): string[] {
  return Object.keys(input).filter((key) => !WHITELIST_SET.has(key))
}

export type ParsedChatSendText =
  | { ok: true; value: { groupId: string; text: string; replyToMsgId?: string } }
  | { ok: false; message: string }

export function parseChatSendTextInput(input: unknown): ParsedChatSendText {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, message: 'sendText input object required' }
  }
  const body = input as Record<string, unknown>
  const disallowed = getDisallowedChatSendTextFields(body)
  if (disallowed.length > 0) {
    return { ok: false, message: `sendText field not allowed: ${disallowed.join(', ')}` }
  }
  const groupId = body.groupId
  const text = body.text
  if (typeof groupId !== 'string' || !groupId.trim()) {
    return { ok: false, message: 'groupId required' }
  }
  if (typeof text !== 'string' || !text.trim()) {
    return { ok: false, message: 'text required' }
  }
  const trimmed = text.trim()
  if (trimmed.length > CHAT_SEND_TEXT_MAX_LENGTH) {
    return { ok: false, message: 'text too long' }
  }
  let replyToMsgId: string | undefined
  if (body.replyToMsgId !== undefined) {
    if (typeof body.replyToMsgId !== 'string' || !body.replyToMsgId.trim()) {
      return { ok: false, message: 'invalid replyToMsgId' }
    }
    replyToMsgId = body.replyToMsgId.trim()
  }
  return {
    ok: true,
    value: {
      groupId: groupId.trim(),
      text: trimmed,
      ...(replyToMsgId ? { replyToMsgId } : {})
    }
  }
}
