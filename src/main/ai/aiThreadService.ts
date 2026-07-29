import { randomUUID } from 'crypto'
import type { Database } from 'better-sqlite3'
import { throwLanpm } from '../../shared/errors/lanpmError.ts'
import type {
  AiMessage,
  AiMessageRole,
  AiThread,
  AiThreadContext,
  AppendAiMessageInput,
  CreateAiThreadInput,
  ListAiThreadsInput
} from '../../shared/ai/types.ts'

interface AiThreadRow {
  thread_id: string
  user_id: string
  group_id: string | null
  title: string
  context_json: string | null
  created_at: string
  updated_at: string
}

interface AiMessageRow {
  message_id: string
  thread_id: string
  role: string
  content: string
  created_at: string
}

function parseContext(raw: string | null): AiThreadContext | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as AiThreadContext
  } catch {
    return null
  }
}

function rowToThread(row: AiThreadRow): AiThread {
  return {
    threadId: row.thread_id,
    userId: row.user_id,
    groupId: row.group_id,
    title: row.title,
    context: parseContext(row.context_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function rowToMessage(row: AiMessageRow): AiMessage {
  return {
    messageId: row.message_id,
    threadId: row.thread_id,
    role: row.role as AiMessageRole,
    content: row.content,
    createdAt: row.created_at
  }
}

function assertThreadOwner(db: Database, threadId: string, userId: string): AiThreadRow {
  const row = db
    .prepare(`SELECT * FROM ai_threads WHERE thread_id = ? AND user_id = ?`)
    .get(threadId, userId) as AiThreadRow | undefined
  if (!row) throwLanpm('stub.messageNotFound')
  return row
}

export function createAiThread(
  db: Database,
  userId: string,
  input: CreateAiThreadInput = {}
): AiThread {
  const now = new Date().toISOString()
  const threadId = `aith_${randomUUID()}`
  const title = input.title?.trim() || '新对话'
  const contextJson = input.context ? JSON.stringify(input.context) : null
  db.prepare(
    `INSERT INTO ai_threads (thread_id, user_id, group_id, title, context_json, created_at, updated_at)
     VALUES (@threadId, @userId, @groupId, @title, @contextJson, @now, @now)`
  ).run({
    threadId,
    userId,
    groupId: input.groupId ?? null,
    title,
    contextJson,
    now
  })
  return rowToThread(
    db.prepare(`SELECT * FROM ai_threads WHERE thread_id = ?`).get(threadId) as AiThreadRow
  )
}

export function listAiThreads(
  db: Database,
  userId: string,
  input: ListAiThreadsInput = {}
): AiThread[] {
  if (input.groupId) {
    return (
      db
        .prepare(
          `SELECT * FROM ai_threads WHERE user_id = ? AND group_id = ? ORDER BY updated_at DESC`
        )
        .all(userId, input.groupId) as AiThreadRow[]
    ).map(rowToThread)
  }
  return (
    db
      .prepare(`SELECT * FROM ai_threads WHERE user_id = ? ORDER BY updated_at DESC`)
      .all(userId) as AiThreadRow[]
  ).map(rowToThread)
}

export function getAiThreadWithMessages(
  db: Database,
  userId: string,
  threadId: string
): { thread: AiThread; messages: AiMessage[] } {
  const threadRow = assertThreadOwner(db, threadId, userId)
  const messages = (
    db
      .prepare(
        `SELECT * FROM ai_messages WHERE thread_id = ? ORDER BY created_at ASC, message_id ASC`
      )
      .all(threadId) as AiMessageRow[]
  ).map(rowToMessage)
  return { thread: rowToThread(threadRow), messages }
}

export function appendAiMessage(
  db: Database,
  userId: string,
  input: AppendAiMessageInput
): AiMessage {
  assertThreadOwner(db, input.threadId, userId)
  const now = new Date().toISOString()
  const messageId = `aim_${randomUUID()}`
  db.prepare(
    `INSERT INTO ai_messages (message_id, thread_id, role, content, created_at)
     VALUES (@messageId, @threadId, @role, @content, @now)`
  ).run({
    messageId,
    threadId: input.threadId,
    role: input.role,
    content: input.content,
    now
  })
  db.prepare(`UPDATE ai_threads SET updated_at = ? WHERE thread_id = ?`).run(now, input.threadId)
  return rowToMessage(
    db.prepare(`SELECT * FROM ai_messages WHERE message_id = ?`).get(messageId) as AiMessageRow
  )
}

export function deleteAiThread(db: Database, userId: string, threadId: string): void {
  assertThreadOwner(db, threadId, userId)
  db.prepare(`DELETE FROM ai_messages WHERE thread_id = ?`).run(threadId)
  db.prepare(`DELETE FROM ai_threads WHERE thread_id = ? AND user_id = ?`).run(threadId, userId)
}

export function touchAiThreadTitle(
  db: Database,
  userId: string,
  threadId: string,
  title: string
): void {
  assertThreadOwner(db, threadId, userId)
  const now = new Date().toISOString()
  db.prepare(`UPDATE ai_threads SET title = ?, updated_at = ? WHERE thread_id = ?`).run(
    title.trim() || '新对话',
    now,
    threadId
  )
}
