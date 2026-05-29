import type { Database } from 'better-sqlite3'
import { randomUUID } from 'crypto'
import type { ChatMessage } from '../../shared/chat/types'
import {
  OFFLINE_SYNC_BATCH_LIMIT,
  OFFLINE_SYNC_META_KEY,
  OFFLINE_SYNC_TTL_DAYS,
  type ChatSyncBatchPayload,
  type ChatSyncRequestPayload,
  offlineSyncCutoffIso
} from '../../shared/chat/offlineSync'
import type { SyncEnvelope } from '../../shared/network/types'
import { isMemoryOnlyChatGroup } from '../../shared/group/guards'
import { listUserGroups, resolveGroupType } from '../group/groupService'
import { getSetupStatus } from '../identity/setup'
import { getNetworkTransport } from '../network'
import { getMeta, setMeta } from '../storage/repositories/syncMetaRepository'
import {
  getMaxLamportTs,
  insertMessage,
  listMessagesSince,
  messageExists
} from '../storage/repositories/messageRepository'
import { broadcastMessage } from './chatBroadcast'

function ttlDays(db: Database): number {
  const raw = getMeta(db, OFFLINE_SYNC_META_KEY)
  const n = raw ? Number(raw) : OFFLINE_SYNC_TTL_DAYS
  return Number.isFinite(n) && n > 0 ? n : OFFLINE_SYNC_TTL_DAYS
}

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

  const minCreatedAt = offlineSyncCutoffIso(ttlDays(db))
  const now = new Date().toISOString()

  for (const group of listUserGroups(db)) {
    if (isMemoryOnlyChatGroup(group.groupId, resolveGroupType(db, group.groupId))) continue
    const sinceLamportTs = getMaxLamportTs(db, group.groupId)
    const payload: ChatSyncRequestPayload = { sinceLamportTs, minCreatedAt }
    const envelope: SyncEnvelope = {
      version: 1,
      type: 'chat_sync_request',
      msgId: `sync_req_${group.groupId}_${Date.now()}`,
      senderUserId: status.user.userId,
      senderDeviceId: status.device.deviceId,
      groupId: group.groupId,
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

  const cutoff = offlineSyncCutoffIso(ttlDays(db))
  for (const incoming of payload.messages) {
    if (!incoming?.msgId || incoming.createdAt < cutoff) continue
    storeIncomingMessage(db, incoming, envelope.groupId)
  }
}

export function initOfflineSyncMeta(db: Database): void {
  if (!getMeta(db, OFFLINE_SYNC_META_KEY)) {
    setMeta(db, OFFLINE_SYNC_META_KEY, String(OFFLINE_SYNC_TTL_DAYS))
  }
}
