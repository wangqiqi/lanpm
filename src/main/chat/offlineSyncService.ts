import type { Database } from 'better-sqlite3'
import { randomUUID } from 'crypto'
import type { ChatMessage } from '../../shared/chat/types'
import {
  OFFLINE_SYNC_BATCH_LIMIT,
  maxLamportInMessages,
  splitOfflineSyncPage,
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
  listRecalledMessagesInGroup,
  messageExists,
  getMessageById,
  updateMessage
} from '../storage/repositories/messageRepository'
import { broadcastMessage } from './chatBroadcast'

/** Safety cap: max pages per sync request (100 × 50 = 5k msgs). */
const OFFLINE_SYNC_MAX_PAGES = 50

function upsertIncomingChatMessage(db: Database, incoming: ChatMessage, groupId: string): void {
  if (messageExists(db, incoming.msgId)) {
    const existing = getMessageById(db, incoming.msgId)
    if (
      existing &&
      incoming.content.kind === 'recalled' &&
      existing.content.kind !== 'recalled'
    ) {
      const stored: ChatMessage = {
        ...incoming,
        groupId,
        deliveryStatus: existing.deliveryStatus
      }
      updateMessage(db, stored)
      broadcastMessage(stored)
    }
    return
  }
  const stored: ChatMessage = { ...incoming, groupId, deliveryStatus: 'sent' }
  insertMessage(db, stored)
  broadcastMessage(stored)
}

async function publishSyncRequest(
  db: Database,
  groupId: string,
  sinceLamportTs: number,
  minCreatedAt: string
): Promise<void> {
  const transport = getNetworkTransport()
  const status = getSetupStatus(db)
  if (!transport || !status.configured || !status.user || !status.device) return

  const envelope: SyncEnvelope = {
    version: 1,
    type: 'chat_sync_request',
    msgId: `sync_req_${groupId}_${Date.now()}_${sinceLamportTs}`,
    senderUserId: status.user.userId,
    senderDeviceId: status.device.deviceId,
    groupId,
    ts: new Date().toISOString(),
    payload: { sinceLamportTs, minCreatedAt } satisfies ChatSyncRequestPayload,
    nonce: '',
    authTag: ''
  }
  await transport.publish(envelope)
}

export async function requestOfflineSync(db: Database): Promise<void> {
  const transport = getNetworkTransport()
  const status = getSetupStatus(db)
  if (!transport || !status.configured || !status.user || !status.device) return

  const minCreatedAt = offlineSyncCutoffIso(SYNC_WINDOW_DAYS)

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
    await publishSyncRequest(db, groupId, sinceLamportTs, minCreatedAt)
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

  const transport = getNetworkTransport()
  if (!transport) return

  let sinceLamportTs = payload.sinceLamportTs ?? 0
  let includeRecalled = sinceLamportTs === 0

  for (let page = 0; page < OFFLINE_SYNC_MAX_PAGES; page++) {
    const raw = listMessagesSince(
      db,
      envelope.groupId,
      sinceLamportTs,
      payload.minCreatedAt,
      OFFLINE_SYNC_BATCH_LIMIT + 1
    )
    const { messages: pageRows, hasMore } = splitOfflineSyncPage(raw, OFFLINE_SYNC_BATCH_LIMIT)
    const pageMessages = pageRows.filter((m) => m.senderDeviceId !== localDeviceId)

    const merged = new Map<string, ChatMessage>()
    for (const m of pageMessages) merged.set(m.msgId, m)

    if (includeRecalled) {
      const recalledMessages = listRecalledMessagesInGroup(
        db,
        envelope.groupId,
        payload.minCreatedAt
      ).filter((m) => m.senderDeviceId !== localDeviceId)
      for (const m of recalledMessages) merged.set(m.msgId, m)
      includeRecalled = false
    }

    const messages = [...merged.values()]
    if (messages.length > 0) {
      const batchPayload: ChatSyncBatchPayload = { messages, hasMore }
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

    if (!hasMore || pageRows.length === 0) break
    sinceLamportTs = maxLamportInMessages(pageRows)
  }
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
    upsertIncomingChatMessage(db, incoming, envelope.groupId)
  }

  // Follow-up if peer only sent one page (or multi-peer partial); advance by batch cursor.
  if (payload.hasMore && payload.messages.length > 0) {
    const nextSince = maxLamportInMessages(payload.messages)
    void publishSyncRequest(db, envelope.groupId, nextSince, cutoff).catch(() => undefined)
  }
}
