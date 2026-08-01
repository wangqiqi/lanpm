/** Extension API v0.6 — `chat.sendMarkdown` allowed fields */
export const CHAT_SEND_MARKDOWN_WHITELIST_FIELDS = ['groupId', 'markdown', 'replyToMsgId'] as const

export type ChatSendMarkdownWhitelistField = (typeof CHAT_SEND_MARKDOWN_WHITELIST_FIELDS)[number]

const WHITELIST_SET = new Set<string>(CHAT_SEND_MARKDOWN_WHITELIST_FIELDS)

export const CHAT_SEND_MARKDOWN_MAX_LENGTH = 32_768

export function getDisallowedChatSendMarkdownFields(input: Record<string, unknown>): string[] {
  return Object.keys(input).filter((key) => !WHITELIST_SET.has(key))
}

export type ParsedChatSendMarkdown =
  | { ok: true; value: { groupId: string; markdown: string; replyToMsgId?: string } }
  | { ok: false; message: string }

export function parseChatSendMarkdownInput(input: unknown): ParsedChatSendMarkdown {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, message: 'sendMarkdown input object required' }
  }
  const body = input as Record<string, unknown>
  const disallowed = getDisallowedChatSendMarkdownFields(body)
  if (disallowed.length > 0) {
    return { ok: false, message: `sendMarkdown field not allowed: ${disallowed.join(', ')}` }
  }
  const groupId = body.groupId
  const markdown = body.markdown
  if (typeof groupId !== 'string' || !groupId.trim()) {
    return { ok: false, message: 'groupId required' }
  }
  if (typeof markdown !== 'string' || !markdown.trim()) {
    return { ok: false, message: 'markdown required' }
  }
  const trimmed = markdown.trim()
  if (trimmed.length > CHAT_SEND_MARKDOWN_MAX_LENGTH) {
    return { ok: false, message: 'markdown too long' }
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
      markdown: trimmed,
      ...(replyToMsgId ? { replyToMsgId } : {})
    }
  }
}
