import type { Database } from 'better-sqlite3'
import { randomUUID } from 'crypto'
import { offlineSyncCutoffIso } from '../../shared/chat/offlineSync'
import {
  READ_RECEIPT_OFFLINE_SYNC_BATCH_LIMIT,
  isReadReceiptSyncBatchPayload,
  isReadReceiptSyncRequestPayload,
  maxReadAtInReceipts,
  splitReadReceiptOfflineSyncPage,
  type ReadReceiptSyncBatchPayload,
  type ReadReceiptSyncRequestPayload
} from '../../shared/chat/readReceipt'
import { SYNC_WINDOW_DAYS } from '../../shared/data/retention'
import { isMemoryOnlyChatGroup } from '../../shared/group/guards'
import type { SyncEnvelope } from '../../shared/network/types'
import { listUserGroups, resolveGroupType } from '../group/groupService'
import { getSetupStatus } from '../identity/setup'
import { getNetworkTransport } from '../network'
import { listDistinctDmGroupIds } from '../storage/repositories/messageRepository'
import {
  getMaxReadAtInGroup,
  listReadReceiptsSince
} from '../storage/repositories/readReceiptRepository'
import { applyRemoteReadReceipt } from './readReceiptService'

const READ_RECEIPT_OFFLINE_SYNC_MAX_PAGES = 50

async function publishReadReceiptSyncRequest(
  db: Database,
  groupId: string,
  sinceReadAt: string,
  minReadAt: string
): Promise<void> {
  const transport = getNetworkTransport()
  const status = getSetupStatus(db)
  if (!transport || !status.configured || !status.user || !status.device) return

  const envelope: SyncEnvelope = {
    version: 1,
    type: 'read_receipt_sync_request',
    msgId: `rr_sync_req_${groupId}_${Date.now()}_${sinceReadAt || '0'}`,
    senderUserId: status.user.userId,
    senderDeviceId: status.device.deviceId,
    groupId,
    ts: new Date().toISOString(),
    payload: { sinceReadAt, minReadAt } satisfies ReadReceiptSyncRequestPayload,
    nonce: '',
    authTag: ''
  }
  await transport.publish(envelope)
}

export async function requestReadReceiptOfflineSync(db: Database): Promise<void> {
  const transport = getNetworkTransport()
  const status = getSetupStatus(db)
  if (!transport || !status.configured || !status.user || !status.device) return

  const minReadAt = offlineSyncCutoffIso(SYNC_WINDOW_DAYS)
  const groupIds = new Set<string>()
  for (const group of listUserGroups(db)) {
    if (isMemoryOnlyChatGroup(group.groupId, resolveGroupType(db, group.groupId))) continue
    groupIds.add(group.groupId)
  }
  for (const dmGroupId of listDistinctDmGroupIds(db)) {
    groupIds.add(dmGroupId)
  }

  for (const groupId of groupIds) {
    const sinceReadAt = getMaxReadAtInGroup(db, groupId)
    await publishReadReceiptSyncRequest(db, groupId, sinceReadAt, minReadAt)
  }
}

export async function handleReadReceiptSyncRequest(
  db: Database,
  envelope: SyncEnvelope
): Promise<void> {
  if (envelope.type !== 'read_receipt_sync_request' || !envelope.groupId) return
  const status = getSetupStatus(db)
  if (!status.configured || !status.user || !status.device) return
  if (envelope.senderDeviceId === status.device.deviceId) return
  if (isMemoryOnlyChatGroup(envelope.groupId, resolveGroupType(db, envelope.groupId))) return
  if (!isReadReceiptSyncRequestPayload(envelope.payload)) return

  const transport = getNetworkTransport()
  if (!transport) return

  let sinceReadAt = envelope.payload.sinceReadAt ?? ''
  const minReadAt = envelope.payload.minReadAt

  for (let page = 0; page < READ_RECEIPT_OFFLINE_SYNC_MAX_PAGES; page++) {
    const raw = listReadReceiptsSince(
      db,
      envelope.groupId,
      sinceReadAt,
      minReadAt,
      READ_RECEIPT_OFFLINE_SYNC_BATCH_LIMIT + 1
    )
    const { receipts, hasMore } = splitReadReceiptOfflineSyncPage(
      raw,
      READ_RECEIPT_OFFLINE_SYNC_BATCH_LIMIT
    )
    // Exclude receipts authored by the requesting peer's device (they already have them).
    const pageReceipts = receipts.filter((r) => r.readerDeviceId !== envelope.senderDeviceId)

    if (pageReceipts.length > 0) {
      const batchPayload: ReadReceiptSyncBatchPayload = { receipts: pageReceipts, hasMore }
      const response: SyncEnvelope = {
        version: 1,
        type: 'read_receipt_sync_batch',
        msgId: `rr_sync_batch_${envelope.groupId}_${randomUUID()}`,
        senderUserId: status.user.userId,
        senderDeviceId: status.device.deviceId,
        groupId: envelope.groupId,
        ts: new Date().toISOString(),
        payload: batchPayload,
        nonce: '',
        authTag: ''
      }
      await transport.publish(response)
    }

    if (!hasMore || receipts.length === 0) break
    sinceReadAt = maxReadAtInReceipts(receipts)
  }
}

export function handleReadReceiptSyncBatch(db: Database, envelope: SyncEnvelope): void {
  if (envelope.type !== 'read_receipt_sync_batch' || !envelope.groupId) return
  const status = getSetupStatus(db)
  if (!status.configured || !status.device) return
  if (envelope.senderDeviceId === status.device.deviceId) return
  if (isMemoryOnlyChatGroup(envelope.groupId, resolveGroupType(db, envelope.groupId))) return
  if (!isReadReceiptSyncBatchPayload(envelope.payload)) return

  const cutoff = offlineSyncCutoffIso(SYNC_WINDOW_DAYS)
  for (const receipt of envelope.payload.receipts) {
    if (receipt.readAt < cutoff) continue
    const normalized = { ...receipt, groupId: envelope.groupId }
    applyRemoteReadReceipt(db, normalized)
  }

  if (envelope.payload.hasMore && envelope.payload.receipts.length > 0) {
    const nextSince = maxReadAtInReceipts(envelope.payload.receipts)
    void publishReadReceiptSyncRequest(db, envelope.groupId, nextSince, cutoff).catch(
      () => undefined
    )
  }
}
