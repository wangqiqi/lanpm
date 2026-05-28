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
