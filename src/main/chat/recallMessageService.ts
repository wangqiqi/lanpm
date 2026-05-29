import { randomUUID } from 'crypto'
import type { Database } from 'better-sqlite3'
import type { ChatMessage } from '../../shared/chat/types'
import {
  applyRecallPayload,
  canRecallMessage,
  type ChatRecallPayload,
  toRecalledMessage
} from '../../shared/chat/recall'
import { isMemoryOnlyChatGroup } from '../../shared/group/guards'
import type { SyncEnvelope } from '../../shared/network'
import { getSetupStatus } from '../identity/setup'
import { resolveGroupType } from '../group/groupService'
import { getNetworkTransport } from '../network'
import {
  listAnonymousMessages,
  replaceAnonymousMessage
} from './anonymousChatStore'
import { broadcastMessage } from './chatBroadcast'
import {
  getMessageById,
  updateMessage
} from '../storage/repositories/messageRepository'

function isAnonymousGroup(db: Database, groupId: string): boolean {
  return isMemoryOnlyChatGroup(groupId, resolveGroupType(db, groupId))
}

export function applyRecallToStoredMessage(
  db: Database,
  groupId: string,
  payload: ChatRecallPayload
): ChatMessage | null {
  if (isAnonymousGroup(db, groupId)) {
    const existing = listAnonymousMessages(groupId).find((m) => m.msgId === payload.msgId)
    if (!existing || existing.content.kind === 'recalled') return null
    const updated = applyRecallPayload(existing, payload)
    replaceAnonymousMessage(groupId, updated)
    return updated
  }

  const existing = getMessageById(db, payload.msgId)
  if (!existing || existing.groupId !== groupId) return null
  if (existing.content.kind === 'recalled') return null

  const updated = applyRecallPayload(existing, payload)
  updateMessage(db, updated)
  return updated
}

export function handleChatRecall(db: Database, envelope: SyncEnvelope): void {
  if (envelope.type !== 'chat_recall' || !envelope.groupId) return
  const payload = envelope.payload as ChatRecallPayload
  if (!payload?.msgId || !payload.recalledBy || !payload.recalledAt) return

  const updated = applyRecallToStoredMessage(db, envelope.groupId, {
    groupId: envelope.groupId,
    msgId: payload.msgId,
    recalledBy: payload.recalledBy,
    recalledAt: payload.recalledAt
  })
  if (updated) broadcastMessage(updated)
}

export async function recallMessage(
  db: Database,
  groupId: string,
  msgId: string
): Promise<ChatMessage> {
  const status = getSetupStatus(db)
  if (!status.configured || !status.user || !status.device) {
    throw new Error('请先完成身份配置')
  }

  let existing: ChatMessage | null | undefined
  if (isAnonymousGroup(db, groupId)) {
    existing = listAnonymousMessages(groupId).find((m) => m.msgId === msgId)
  } else {
    existing = getMessageById(db, msgId)
  }

  if (!existing || existing.groupId !== groupId) {
    throw new Error('消息不存在')
  }
  if (!canRecallMessage(existing, status.user.userId)) {
    throw new Error('只能撤回自己发送的消息')
  }

  const recalledAt = new Date().toISOString()
  const updated = toRecalledMessage(existing, status.user.userId, recalledAt)

  if (isAnonymousGroup(db, groupId)) {
    replaceAnonymousMessage(groupId, updated)
  } else {
    updateMessage(db, updated)
  }

  broadcastMessage(updated)

  const transport = getNetworkTransport()
  if (transport) {
    const payload: ChatRecallPayload = {
      groupId,
      msgId,
      recalledBy: status.user.userId,
      recalledAt
    }
    const envelope: SyncEnvelope = {
      version: 1,
      type: 'chat_recall',
      msgId: `recall_${msgId}_${randomUUID()}`,
      senderUserId: status.user.userId,
      senderDeviceId: status.device.deviceId,
      groupId,
      ts: recalledAt,
      payload,
      nonce: '',
      authTag: ''
    }
    await transport.publish(envelope)
  }

  return updated
}
