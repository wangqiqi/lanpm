import type { GroupMemberView } from './members'

const MENTION_TOKEN = /@([^\s@]+)/g

function keysForMember(member: GroupMemberView): string[] {
  const keys = new Set<string>()
  keys.add(member.userId.toLowerCase())
  keys.add(member.displayName.toLowerCase())
  for (const k of member.mentionKeys ?? []) {
    keys.add(k.toLowerCase())
  }
  return [...keys]
}

/** 从文本解析 @提及，返回去重后的 userId 列表 */
export function parseMentions(text: string, members: GroupMemberView[]): string[] {
  const found = new Set<string>()
  for (const match of text.matchAll(MENTION_TOKEN)) {
    const token = match[1]?.trim().toLowerCase()
    if (!token) continue
    for (const member of members) {
      const keys = keysForMember(member)
      if (keys.some((k) => k === token || k.startsWith(token) || token.startsWith(k))) {
        found.add(member.userId)
        break
      }
    }
  }
  return [...found]
}

export interface MentionSegment {
  kind: 'text' | 'mention'
  value: string
  userId?: string
}

/** 将文本拆分为普通片段与 @mention 片段（用于渲染高亮） */
export function splitMentionSegments(
  text: string,
  members: GroupMemberView[]
): MentionSegment[] {
  const segments: MentionSegment[] = []
  let lastIndex = 0
  for (const match of text.matchAll(MENTION_TOKEN)) {
    const index = match.index ?? 0
    if (index > lastIndex) {
      segments.push({ kind: 'text', value: text.slice(lastIndex, index) })
    }
    const token = match[1] ?? ''
    let userId: string | undefined
    const lower = token.toLowerCase()
    for (const member of members) {
      const keys = keysForMember(member)
      if (keys.some((k) => k === lower || k.startsWith(lower) || lower.startsWith(k))) {
        userId = member.userId
        break
      }
    }
    segments.push({ kind: 'mention', value: `@${token}`, userId })
    lastIndex = index + match[0].length
  }
  if (lastIndex < text.length) {
    segments.push({ kind: 'text', value: text.slice(lastIndex) })
  }
  return segments.length ? segments : [{ kind: 'text', value: text }]
}
