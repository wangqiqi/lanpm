import type { Database } from 'better-sqlite3'
import type { ReadReceipt } from '../../../shared/chat/readReceipt'

export function upsertReadReceipt(db: Database, receipt: ReadReceipt): void {
  const existing = db
    .prepare(
      `SELECT read_at FROM read_receipts
       WHERE msg_id = ? AND reader_user_id = ?`
    )
    .get(receipt.msgId, receipt.readerUserId) as { read_at: string } | undefined

  if (existing && existing.read_at >= receipt.readAt) return

  db.prepare(
    `INSERT INTO read_receipts (
      msg_id, group_id, reader_user_id, reader_device_id, read_at
    ) VALUES (
      @msgId, @groupId, @readerUserId, @readerDeviceId, @readAt
    )
    ON CONFLICT(msg_id, reader_user_id) DO UPDATE SET
      reader_device_id = excluded.reader_device_id,
      read_at = excluded.read_at
    WHERE excluded.read_at > read_receipts.read_at`
  ).run({
    msgId: receipt.msgId,
    groupId: receipt.groupId,
    readerUserId: receipt.readerUserId,
    readerDeviceId: receipt.readerDeviceId,
    readAt: receipt.readAt
  })
}

export function listReaderUserIds(db: Database, msgId: string): string[] {
  const rows = db
    .prepare(`SELECT DISTINCT reader_user_id FROM read_receipts WHERE msg_id = ?`)
    .all(msgId) as { reader_user_id: string }[]
  return rows.map((r) => r.reader_user_id)
}

export function hasUserReadMessage(db: Database, msgId: string, readerUserId: string): boolean {
  const row = db
    .prepare(`SELECT 1 FROM read_receipts WHERE msg_id = ? AND reader_user_id = ?`)
    .get(msgId, readerUserId)
  return row !== undefined
}

/**
 * Offline pull: receipts with read_at > sinceReadAt and >= minReadAt.
 * Ordered ASC for pagination cursor (sinceReadAt = last page max).
 */
export function listReadReceiptsSince(
  db: Database,
  groupId: string,
  sinceReadAt: string,
  minReadAt: string,
  limit = 100
): ReadReceipt[] {
  const rows = db
    .prepare(
      `SELECT msg_id, group_id, reader_user_id, reader_device_id, read_at
       FROM read_receipts
       WHERE group_id = ?
         AND read_at > ?
         AND read_at >= ?
       ORDER BY read_at ASC, msg_id ASC, reader_user_id ASC
       LIMIT ?`
    )
    .all(groupId, sinceReadAt, minReadAt, limit) as {
    msg_id: string
    group_id: string
    reader_user_id: string
    reader_device_id: string
    read_at: string
  }[]

  return rows.map((r) => ({
    msgId: r.msg_id,
    groupId: r.group_id,
    readerUserId: r.reader_user_id,
    readerDeviceId: r.reader_device_id,
    readAt: r.read_at
  }))
}

export function getMaxReadAtInGroup(db: Database, groupId: string): string {
  const row = db
    .prepare(`SELECT MAX(read_at) AS max_at FROM read_receipts WHERE group_id = ?`)
    .get(groupId) as { max_at: string | null } | undefined
  return row?.max_at ?? ''
}
