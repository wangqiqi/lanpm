import type { Database } from 'better-sqlite3'
import { extractMessageText } from '../../../shared/search/extractMessageText'
import type { MessageContent } from '../../../shared/chat/types'
import {
  searchMessagesInDocs,
  searchTasksInDocs,
  type MessageSearchDoc,
  type TaskSearchDoc
} from '../../search/miniSearchIndex'

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

/** Query-time index cap (no write-path incremental index this sprint). */
const MAX_MESSAGE_DOCS = 8000

function parseContent(raw: string): MessageContent {
  const parsed = JSON.parse(raw) as { content?: MessageContent } | MessageContent
  if (parsed && typeof parsed === 'object' && 'content' in parsed && parsed.content) {
    return parsed.content
  }
  return parsed as MessageContent
}

function loadTaskDocs(db: Database): TaskSearchDoc[] {
  const rows = db
    .prepare(
      `SELECT task_id, group_id, title FROM tasks
       WHERE deleted_at IS NULL
       ORDER BY updated_at DESC`
    )
    .all() as TaskHitRow[]
  return rows.map((r) => ({
    id: r.task_id,
    kind: 'task' as const,
    groupId: r.group_id,
    title: r.title,
    body: r.title
  }))
}

function loadMessageDocs(db: Database): MessageSearchDoc[] {
  const rows = db
    .prepare(
      `SELECT msg_id, group_id, content_json FROM messages
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .all(MAX_MESSAGE_DOCS) as MessageHitRow[]

  const docs: MessageSearchDoc[] = []
  for (const row of rows) {
    try {
      const text = extractMessageText(parseContent(row.content_json))
      if (!text.trim()) continue
      docs.push({
        id: row.msg_id,
        kind: 'message',
        groupId: row.group_id,
        body: text
      })
    } catch {
      /* skip malformed */
    }
  }
  return docs
}

export function searchTasksByTitle(
  db: Database,
  query: string,
  limit: number
): { taskId: string; groupId: string; title: string }[] {
  return searchTasksInDocs(loadTaskDocs(db), query, limit)
}

export function searchMessagesByContent(
  db: Database,
  query: string,
  limit: number
): { msgId: string; groupId: string; snippet: string }[] {
  return searchMessagesInDocs(loadMessageDocs(db), query, limit)
}
