/** docs/04 §3.3 — 已读回执 */
export interface ReadReceipt {
  msgId: string
  groupId: string
  readerUserId: string
  readerDeviceId: string
  readAt: string
}

export interface ReadReceiptPayload {
  receipt: ReadReceipt
}

/** 已读离线补拉请求（TASK-151；7 天窗对齐 chat/task） */
export interface ReadReceiptSyncRequestPayload {
  /** 排他下界；空串 = 从 epoch */
  sinceReadAt: string
  /** 7 天 cutoff ISO8601 */
  minReadAt: string
}

export interface ReadReceiptSyncBatchPayload {
  receipts: ReadReceipt[]
  hasMore?: boolean
}

/** Align with chat/task offline batch size */
export const READ_RECEIPT_OFFLINE_SYNC_BATCH_LIMIT = 100

export function splitReadReceiptOfflineSyncPage(
  rows: ReadReceipt[],
  limit = READ_RECEIPT_OFFLINE_SYNC_BATCH_LIMIT
): { receipts: ReadReceipt[]; hasMore: boolean } {
  if (rows.length > limit) {
    return { receipts: rows.slice(0, limit), hasMore: true }
  }
  return { receipts: rows, hasMore: false }
}

export function maxReadAtInReceipts(receipts: ReadReceipt[]): string {
  let max = ''
  for (const r of receipts) {
    if (r.readAt > max) max = r.readAt
  }
  return max
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isReadReceipt(value: unknown): value is ReadReceipt {
  if (!isRecord(value)) return false
  return (
    typeof value.msgId === 'string' &&
    !!value.msgId &&
    typeof value.groupId === 'string' &&
    !!value.groupId &&
    typeof value.readerUserId === 'string' &&
    !!value.readerUserId &&
    typeof value.readerDeviceId === 'string' &&
    !!value.readerDeviceId &&
    typeof value.readAt === 'string' &&
    !!value.readAt
  )
}

export function isReadReceiptSyncRequestPayload(
  value: unknown
): value is ReadReceiptSyncRequestPayload {
  if (!isRecord(value)) return false
  return typeof value.sinceReadAt === 'string' && typeof value.minReadAt === 'string' && !!value.minReadAt
}

export function isReadReceiptSyncBatchPayload(
  value: unknown
): value is ReadReceiptSyncBatchPayload {
  if (!isRecord(value)) return false
  if (!Array.isArray(value.receipts)) return false
  if (value.hasMore !== undefined && typeof value.hasMore !== 'boolean') return false
  return value.receipts.every(isReadReceipt)
}

/** 任一非发送方 userId 已读即视为已读（M2 双实例 / 小群） */
export function isMessageReadByOthers(
  senderUserId: string,
  readerUserIds: string[]
): boolean {
  return readerUserIds.some((id) => id !== senderUserId)
}
