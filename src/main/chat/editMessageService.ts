import { randomUUID } from 'crypto'
import type { Database } from 'better-sqlite3'
import { throwLanpm } from '../../shared/errors/lanpmError'
import type { ChatMessage } from '../../shared/chat/types'
import { canEditMessage } from '../../shared/chat/messageEdit'
import type { SyncEnvelope } from '../../shared/network'
import { getSetupStatus } from '../identity/setup'
import { getNetworkTransport } from '../network'
import { broadcastMessage } from './chatBroadcast'
import { getMessageById, updateMessage } from '../storage/repositories/messageRepository'

export interface ChatEditPayload {
  groupId: string
  msgId: string
  text: string
  editedAt: string
  editedBy: string
}

function buildEditEnvelope(payload: ChatEditPayload, status: {
  user: { userId: string }
  device: { deviceId: string }
}): SyncEnvelope {
  return {
    version: 1,
    type: 'chat_edit',
    msgId: `edit_${randomUUID()}`,
    senderUserId: status.user.userId,
    senderDeviceId: status.device.deviceId,
    groupId: payload.groupId,
    ts: payload.editedAt,
    payload,
    nonce: '',
    authTag: ''
  }
}

export function applyChatEdit(db: Database, payload: ChatEditPayload): ChatMessage | null {
  const existing = getMessageById(db, payload.msgId)
  if (!existing || existing.groupId !== payload.groupId) return null
  if (existing.content.kind !== 'text') return null

  const updated: ChatMessage = {
    ...existing,
    content: {
      kind: 'text',
      text: payload.text,
      meta: {
        ...existing.content.meta,
        editedAt: payload.editedAt
      }
    }
  }
  updateMessage(db, updated)
  return updated
}

export function handleChatEdit(db: Database, envelope: SyncEnvelope): void {
  if (envelope.type !== 'chat_edit' || !envelope.groupId) return
  const payload = envelope.payload as ChatEditPayload
  if (!payload?.msgId || !payload.text || !payload.editedAt) return
  const updated = applyChatEdit(db, payload)
  if (updated) broadcastMessage(updated)
}

export async function editTextMessage(
  db: Database,
  groupId: string,
  msgId: string,
  text: string
): Promise<ChatMessage> {
  const status = getSetupStatus(db)
  if (!status.configured || !status.user || !status.device) {
    throwLanpm('stub.identityRequired')
  }
  const trimmed = text.trim()
  if (!trimmed) throwLanpm('stub.messageEmpty')

  const existing = getMessageById(db, msgId)
  if (!existing || existing.groupId !== groupId) throwLanpm('stub.messageNotFound')
  if (!canEditMessage(existing, status.user.userId)) throwLanpm('err.chatEditNotAllowed')

  const editedAt = new Date().toISOString()
  const payload: ChatEditPayload = {
    groupId,
    msgId,
    text: trimmed,
    editedAt,
    editedBy: status.user.userId
  }

  const updated = applyChatEdit(db, payload)
  if (!updated) throwLanpm('err.chatEditFailed')

  const transport = getNetworkTransport()
  if (transport) {
    await transport.publish(buildEditEnvelope(payload, status as { user: { userId: string }; device: { deviceId: string } }))
  }

  broadcastMessage(updated)
  return updated
}
