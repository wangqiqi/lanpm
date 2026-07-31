import { randomUUID } from 'crypto'
import type { Database } from 'better-sqlite3'
import { throwLanpm } from '../../shared/errors/lanpmError'
import type { ChatPinPayload } from '../../shared/chat/pin'
import { mergePinPayload, togglePinId } from '../../shared/chat/pin'
import type { SyncEnvelope } from '../../shared/network'
import { getSetupStatus } from '../identity/setup'
import { getNetworkTransport } from '../network'
import { getMeta, setMeta } from '../storage/repositories/syncMetaRepository'

const pinMetaKey = (groupId: string): string => `chat_pins:${groupId}`

function readPinPayload(db: Database, groupId: string): ChatPinPayload | null {
  const raw = getMeta(db, pinMetaKey(groupId))
  if (!raw) return null
  try {
    return JSON.parse(raw) as ChatPinPayload
  } catch {
    return null
  }
}

function writePinPayload(db: Database, payload: ChatPinPayload): void {
  setMeta(db, pinMetaKey(payload.groupId), JSON.stringify(payload))
}

function buildPinEnvelope(payload: ChatPinPayload, status: {
  user: { userId: string }
  device: { deviceId: string }
}): SyncEnvelope {
  return {
    version: 1,
    type: 'chat_pin',
    msgId: `pin_${randomUUID()}`,
    senderUserId: status.user.userId,
    senderDeviceId: status.device.deviceId,
    groupId: payload.groupId,
    ts: payload.updatedAt,
    payload,
    nonce: '',
    authTag: ''
  }
}

export function listPinnedMessageIds(db: Database, groupId: string): string[] {
  return readPinPayload(db, groupId)?.msgIds ?? []
}

export function handleChatPin(db: Database, envelope: SyncEnvelope): void {
  if (envelope.type !== 'chat_pin' || !envelope.groupId) return
  const incoming = envelope.payload as ChatPinPayload
  if (!incoming?.groupId || !Array.isArray(incoming.msgIds) || !incoming.updatedAt) return
  const local = readPinPayload(db, incoming.groupId)
  const merged = mergePinPayload(local, incoming)
  writePinPayload(db, merged)
}

export async function togglePinnedMessage(
  db: Database,
  groupId: string,
  msgId: string
): Promise<string[]> {
  const status = getSetupStatus(db)
  if (!status.configured || !status.user || !status.device) {
    throwLanpm('stub.identityRequired')
  }

  const local = readPinPayload(db, groupId)
  const msgIds = togglePinId(local?.msgIds ?? [], msgId)
  const payload: ChatPinPayload = {
    groupId,
    msgIds,
    updatedAt: new Date().toISOString(),
    updatedBy: status.user.userId
  }
  writePinPayload(db, payload)

  const transport = getNetworkTransport()
  if (transport) {
    await transport.publish(
      buildPinEnvelope(payload, status as { user: { userId: string }; device: { deviceId: string } })
    )
  }

  return msgIds
}
