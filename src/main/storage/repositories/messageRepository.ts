import type { Database } from 'better-sqlite3'
import type { ChatMessage, MessageContent, MessageDeliveryStatus } from '../../../shared/chat/types'

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
