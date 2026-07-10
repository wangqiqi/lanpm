import type { Database } from 'better-sqlite3'
import type { ChatMessage, MessageContent, MessageDeliveryStatus } from '../../../shared/chat/types'
import { CHAT_HISTORY_PAGE_SIZE, type ChatMessagePage } from '../../../shared/chat/pagination.ts'

interface MessageRow {
  msg_id: string
  group_id: string
  sender_user_id: string
  sender_device_id: string
  type: string
  content_json: string
  lamport_ts: number
  created_at: string
  delivery_status: string
}

interface StoredMessagePayload {
  content: MessageContent
  mentions?: string[]
  replyToMsgId?: string
}

function parsePayload(raw: string): StoredMessagePayload {
  const parsed = JSON.parse(raw) as StoredMessagePayload | MessageContent
  if (parsed && typeof parsed === 'object' && 'content' in parsed) {
    return parsed as StoredMessagePayload
  }
  return { content: parsed as MessageContent }
}

function rowToMessage(row: MessageRow): ChatMessage {
  const payload = parsePayload(row.content_json)
  return {
    msgId: row.msg_id,
    groupId: row.group_id,
    senderUserId: row.sender_user_id,
    senderDeviceId: row.sender_device_id,
    type: row.type as ChatMessage['type'],
    content: payload.content,
    lamportTs: row.lamport_ts,
    createdAt: row.created_at,
    deliveryStatus: row.delivery_status as MessageDeliveryStatus,
    mentions: payload.mentions,
    replyToMsgId: payload.replyToMsgId
  }
}

function serializePayload(message: ChatMessage): string {
  const payload: StoredMessagePayload = {
    content: message.content,
    mentions: message.mentions,
    replyToMsgId: message.replyToMsgId
  }
  return JSON.stringify(payload)
}

export function insertMessage(db: Database, message: ChatMessage): void {
  db.prepare(
    `INSERT INTO messages (
      msg_id, group_id, sender_user_id, sender_device_id,
      type, content_json, lamport_ts, created_at, delivery_status
    ) VALUES (
      @msgId, @groupId, @senderUserId, @senderDeviceId,
      @type, @contentJson, @lamportTs, @createdAt, @deliveryStatus
    )`
  ).run({
    msgId: message.msgId,
    groupId: message.groupId,
    senderUserId: message.senderUserId,
    senderDeviceId: message.senderDeviceId,
    type: message.type,
    contentJson: serializePayload(message),
    lamportTs: message.lamportTs,
    createdAt: message.createdAt,
    deliveryStatus: message.deliveryStatus
  })
}

export function messageExists(db: Database, msgId: string): boolean {
  const row = db.prepare('SELECT 1 FROM messages WHERE msg_id = ?').get(msgId)
  return row !== undefined
}

export function getMessageById(db: Database, msgId: string): ChatMessage | null {
  const row = db.prepare('SELECT * FROM messages WHERE msg_id = ?').get(msgId) as
    | MessageRow
    | undefined
  return row ? rowToMessage(row) : null
}

export function updateDeliveryStatus(
  db: Database,
  msgId: string,
  status: MessageDeliveryStatus
): void {
  db.prepare('UPDATE messages SET delivery_status = ? WHERE msg_id = ?').run(status, msgId)
}

export function getMaxLamportTs(db: Database, groupId: string): number {
  const row = db
    .prepare('SELECT MAX(lamport_ts) AS max_ts FROM messages WHERE group_id = ?')
    .get(groupId) as { max_ts: number | null } | undefined
  return row?.max_ts ?? 0
}

export function listMessagesByGroup(
  db: Database,
  groupId: string,
  limit = 200
): ChatMessage[] {
  const rows = db
    .prepare(
      `SELECT * FROM messages
       WHERE group_id = ?
       ORDER BY lamport_ts ASC, created_at ASC
       LIMIT ?`
    )
    .all(groupId, limit) as MessageRow[]
  return rows.map(rowToMessage)
}

/** Newest `limit` messages (ASC for UI), with hasMore when older history exists. */
export function listRecentMessagesPage(
  db: Database,
  groupId: string,
  limit = CHAT_HISTORY_PAGE_SIZE
): ChatMessagePage {
  const rows = db
    .prepare(
      `SELECT * FROM messages
       WHERE group_id = ?
       ORDER BY lamport_ts DESC, created_at DESC
       LIMIT ?`
    )
    .all(groupId, limit + 1) as MessageRow[]
  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  return {
    messages: page.reverse().map(rowToMessage),
    hasMore
  }
}

/** Older page strictly before `beforeLamportTs` (ASC for prepend). */
export function listMessagesBeforePage(
  db: Database,
  groupId: string,
  beforeLamportTs: number,
  limit = CHAT_HISTORY_PAGE_SIZE
): ChatMessagePage {
  const rows = db
    .prepare(
      `SELECT * FROM messages
       WHERE group_id = ?
         AND lamport_ts < ?
       ORDER BY lamport_ts DESC, created_at DESC
       LIMIT ?`
    )
    .all(groupId, beforeLamportTs, limit + 1) as MessageRow[]
  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  return {
    messages: page.reverse().map(rowToMessage),
    hasMore
  }
}

/** ARCH-07 — 离线补同步：拉取 lamport 之后且未过 TTL 的消息 */
export function listDistinctDmGroupIds(db: Database): string[] {
  const rows = db
    .prepare(
      `SELECT DISTINCT group_id AS groupId FROM messages WHERE group_id LIKE 'dm:%'`
    )
    .all() as { groupId: string }[]
  return rows.map((r) => r.groupId)
}

export function updateMessage(db: Database, message: ChatMessage): void {
  db.prepare(
    `UPDATE messages SET
      type = @type,
      content_json = @contentJson,
      delivery_status = @deliveryStatus
     WHERE msg_id = @msgId`
  ).run({
    msgId: message.msgId,
    type: message.type,
    contentJson: serializePayload(message),
    deliveryStatus: message.deliveryStatus
  })
}

export function listRecalledMessagesInGroup(
  db: Database,
  groupId: string,
  minCreatedAt: string
): ChatMessage[] {
  const rows = db
    .prepare(
      `SELECT * FROM messages
       WHERE group_id = ?
         AND created_at >= ?
         AND content_json LIKE '%"kind":"recalled"%'
       ORDER BY lamport_ts ASC, created_at ASC`
    )
    .all(groupId, minCreatedAt) as MessageRow[]
  return rows.map(rowToMessage)
}

export function deleteMessagesOlderThan(db: Database, cutoffIso: string, groupId?: string): number {
  if (groupId) {
    return db
      .prepare(`DELETE FROM messages WHERE group_id = ? AND created_at < ?`)
      .run(groupId, cutoffIso).changes
  }
  return db.prepare(`DELETE FROM messages WHERE created_at < ?`).run(cutoffIso).changes
}

export function deleteAllMessagesInGroup(db: Database, groupId: string): number {
  return db.prepare(`DELETE FROM messages WHERE group_id = ?`).run(groupId).changes
}

export function countMessages(db: Database): number {
  const row = db.prepare(`SELECT COUNT(*) AS c FROM messages`).get() as { c: number }
  return row.c
}

export function listMessagesSince(
  db: Database,
  groupId: string,
  sinceLamportTs: number,
  minCreatedAt: string,
  limit = 100
): ChatMessage[] {
  const rows = db
    .prepare(
      `SELECT * FROM messages
       WHERE group_id = ?
         AND lamport_ts > ?
         AND created_at >= ?
       ORDER BY lamport_ts ASC, created_at ASC
       LIMIT ?`
    )
    .all(groupId, sinceLamportTs, minCreatedAt, limit) as MessageRow[]
  return rows.map(rowToMessage)
}
