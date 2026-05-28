import type { Database } from 'better-sqlite3'
import { extractMessageText } from '../../../shared/search/extractMessageText'
import type { MessageContent } from '../../../shared/chat/types'

interface TaskHitRow {
  task_id: string
  group_id: string
  title: string
}

interface MessageHitRow {
  msg_id: string
  group_id: string
  content_json: string
}

function parseContent(raw: string): MessageContent {
  const parsed = JSON.parse(raw) as { content?: MessageContent } | MessageContent
  if (parsed && typeof parsed === 'object' && 'content' in parsed && parsed.content) {
    return parsed.content
  }
  return parsed as MessageContent
}

function snippet(text: string, query: string, maxLen = 80): string {
  const lower = text.toLowerCase()
  const q = query.toLowerCase()
  const idx = lower.indexOf(q)
  if (idx < 0) return text.slice(0, maxLen)
  const start = Math.max(0, idx - 20)
  const end = Math.min(text.length, idx + query.length + 40)
  const prefix = start > 0 ? '…' : ''
  const suffix = end < text.length ? '…' : ''
  return `${prefix}${text.slice(start, end)}${suffix}`
}

export function searchTasksByTitle(
  db: Database,
  query: string,
  limit: number
): { taskId: string; groupId: string; title: string }[] {
  const pattern = `%${query}%`
  const rows = db
    .prepare(
      `SELECT task_id, group_id, title FROM tasks
       WHERE deleted_at IS NULL AND title LIKE ?
       ORDER BY updated_at DESC
       LIMIT ?`
    )
    .all(pattern, limit) as TaskHitRow[]
  return rows.map((r) => ({ taskId: r.task_id, groupId: r.group_id, title: r.title }))
}

export function searchMessagesByContent(
  db: Database,
  query: string,
  limit: number
): { msgId: string; groupId: string; snippet: string }[] {
  const pattern = `%${query}%`
  const rows = db
    .prepare(
      `SELECT msg_id, group_id, content_json FROM messages
       WHERE content_json LIKE ?
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .all(pattern, limit * 3) as MessageHitRow[]

  const hits: { msgId: string; groupId: string; snippet: string }[] = []
  for (const row of rows) {
    try {
      const content = parseContent(row.content_json)
      const text = extractMessageText(content)
      if (!text.toLowerCase().includes(query.toLowerCase())) continue
      hits.push({
        msgId: row.msg_id,
        groupId: row.group_id,
        snippet: snippet(text, query)
      })
      if (hits.length >= limit) break
    } catch {
      /* skip malformed */
    }
  }
  return hits
}
