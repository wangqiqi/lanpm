import type { Database } from 'better-sqlite3'
import { randomUUID } from 'crypto'
import type { ChatMessage } from '../../shared/chat/types'
import {
  OFFLINE_SYNC_BATCH_LIMIT,
  type ChatSyncBatchPayload,
  type ChatSyncRequestPayload,
  offlineSyncCutoffIso
} from '../../shared/chat/offlineSync'
import { SYNC_WINDOW_DAYS } from '../../shared/data/retention'
import type { SyncEnvelope } from '../../shared/network/types'
import { isMemoryOnlyChatGroup } from '../../shared/group/guards'
import { listUserGroups, resolveGroupType } from '../group/groupService'
import { getSetupStatus } from '../identity/setup'
import { getNetworkTransport } from '../network'
import {
  getMaxLamportTs,
  insertMessage,
  listDistinctDmGroupIds,
  listMessagesSince,
  messageExists
} from '../storage/repositories/messageRepository'
import { broadcastMessage } from './chatBroadcast'

function storeIncomingMessage(db: Database, incoming: ChatMessage, groupId: string): void {
  if (messageExists(db, incoming.msgId)) return
  const stored: ChatMessage = { ...incoming, groupId, deliveryStatus: 'sent' }
  insertMessage(db, stored)
  broadcastMessage(stored)
}

export async function requestOfflineSync(db: Database): Promise<void> {
  const transport = getNetworkTransport()
  const status = getSetupStatus(db)
  if (!transport || !status.configured || !status.user || !status.device) return

  const minCreatedAt = offlineSyncCutoffIso(SYNC_WINDOW_DAYS)
  const now = new Date().toISOString()

  const groupIds = new Set<string>()
  for (const group of listUserGroups(db)) {
    if (isMemoryOnlyChatGroup(group.groupId, resolveGroupType(db, group.groupId))) continue
    groupIds.add(group.groupId)
  }
  for (const dmGroupId of listDistinctDmGroupIds(db)) {
    groupIds.add(dmGroupId)
  }

  for (const groupId of groupIds) {
    const sinceLamportTs = getMaxLamportTs(db, groupId)
    const payload: ChatSyncRequestPayload = { sinceLamportTs, minCreatedAt }
    const envelope: SyncEnvelope = {
      version: 1,
      type: 'chat_sync_request',
      msgId: `sync_req_${groupId}_${Date.now()}`,
      senderUserId: status.user.userId,
      senderDeviceId: status.device.deviceId,
      groupId,
      ts: now,
      payload,
      nonce: '',
      authTag: ''
    }
    await transport.publish(envelope)
  }
}

export async function handleChatSyncRequest(db: Database, envelope: SyncEnvelope): Promise<void> {
  if (envelope.type !== 'chat_sync_request' || !envelope.groupId) return
  const status = getSetupStatus(db)
  if (!status.configured || !status.user || !status.device) return
  const localDeviceId = status.device.deviceId
  if (envelope.senderDeviceId === localDeviceId) return
  if (isMemoryOnlyChatGroup(envelope.groupId, resolveGroupType(db, envelope.groupId))) return

  const payload = envelope.payload as ChatSyncRequestPayload
  if (!payload?.minCreatedAt) return

  const messages = listMessagesSince(
    db,
    envelope.groupId,
    payload.sinceLamportTs ?? 0,
    payload.minCreatedAt,
    OFFLINE_SYNC_BATCH_LIMIT
  ).filter((m) => m.senderDeviceId !== localDeviceId)

  if (messages.length === 0) return

  const transport = getNetworkTransport()
  if (!transport) return

  const batchPayload: ChatSyncBatchPayload = { messages }
  const response: SyncEnvelope = {
    version: 1,
    type: 'chat_sync_batch',
    msgId: `sync_batch_${envelope.groupId}_${randomUUID()}`,
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

export function handleChatSyncBatch(db: Database, envelope: SyncEnvelope): void {
  if (envelope.type !== 'chat_sync_batch' || !envelope.groupId) return
  const status = getSetupStatus(db)
  if (!status.configured || !status.device) return
  if (envelope.senderDeviceId === status.device.deviceId) return
  if (isMemoryOnlyChatGroup(envelope.groupId, resolveGroupType(db, envelope.groupId))) return

  const payload = envelope.payload as ChatSyncBatchPayload
  if (!Array.isArray(payload?.messages)) return

  const cutoff = offlineSyncCutoffIso(SYNC_WINDOW_DAYS)
  for (const incoming of payload.messages) {
    if (!incoming?.msgId || incoming.createdAt < cutoff) continue
    storeIncomingMessage(db, incoming, envelope.groupId)
  }
}
