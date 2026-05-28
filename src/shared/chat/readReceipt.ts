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

/** 任一非发送方 userId 已读即视为已读（M2 双实例 / 小群） */
export function isMessageReadByOthers(
  senderUserId: string,
  readerUserIds: string[]
): boolean {
  return readerUserIds.some((id) => id !== senderUserId)
}
