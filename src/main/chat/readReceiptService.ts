import { randomUUID } from 'crypto'
import type { Database } from 'better-sqlite3'
import type { ReadReceipt, ReadReceiptPayload } from '../../shared/chat/readReceipt'
import { isMessageReadByOthers } from '../../shared/chat/readReceipt'
import type { SyncEnvelope } from '../../shared/network'
import { getSetupStatus } from '../identity/setup'
import { getNetworkTransport } from '../network/stub'
import { NetworkStub } from '../network/stub/NetworkStub'
import {
  getMessageById,
  updateDeliveryStatus
} from '../storage/repositories/messageRepository'
import {
  hasUserReadMessage,
  listReaderUserIds,
  upsertReadReceipt
} from '../storage/repositories/readReceiptRepository'
import { broadcastMessage } from './chatBroadcast'

let readReceiptUnsub: (() => void) | null = null

function applyReadStatusToMessage(db: Database, msgId: string): void {
  const msg = getMessageById(db, msgId)
  if (!msg || msg.deliveryStatus === 'read') return

  const readers = listReaderUserIds(db, msgId)
  if (!isMessageReadByOthers(msg.senderUserId, readers)) return

  updateDeliveryStatus(db, msgId, 'read')
  broadcastMessage({ ...msg, deliveryStatus: 'read' })
}

export function handleIncomingReadReceipt(db: Database, envelope: SyncEnvelope): void {
  if (envelope.type !== 'read_receipt') return
  const payload = envelope.payload as ReadReceiptPayload
  const receipt = payload?.receipt
  if (!receipt?.msgId || !receipt.readerUserId) return

  upsertReadReceipt(db, receipt)
  applyReadStatusToMessage(db, receipt.msgId)
}

export async function markMessagesRead(
  db: Database,
  groupId: string,
  msgIds: string[]
): Promise<void> {
  const status = getSetupStatus(db)
  if (!status.configured || !status.user || !status.device) return

  const transport = getNetworkTransport()
  if (!transport) return

  const localUserId = status.user.userId
  const localDeviceId = status.device.deviceId
  const now = new Date().toISOString()

  for (const msgId of msgIds) {
    if (hasUserReadMessage(db, msgId, localUserId)) continue
    const msg = getMessageById(db, msgId)
    if (!msg || msg.groupId !== groupId) continue
    if (msg.senderUserId === localUserId) continue

    const receipt: ReadReceipt = {
      msgId,
      groupId,
      readerUserId: localUserId,
      readerDeviceId: localDeviceId,
      readAt: now
    }
    upsertReadReceipt(db, receipt)

    const envelope: SyncEnvelope = {
      version: 1,
      type: 'read_receipt',
      msgId: `rr_${randomUUID()}`,
      senderUserId: localUserId,
      senderDeviceId: localDeviceId,
      groupId,
      ts: now,
      payload: { receipt } satisfies ReadReceiptPayload,
      nonce: '',
      authTag: ''
    }
    await transport.publish(envelope)
  }
}

export function initReadReceiptService(db: Database): void {
  readReceiptUnsub?.()
  readReceiptUnsub = null

  const transport = getNetworkTransport()
  if (!transport) return

  const stub = transport as NetworkStub
  if (typeof stub.subscribeAll === 'function') {
    readReceiptUnsub = stub.subscribeAll((env) => handleIncomingReadReceipt(db, env))
  }
}

export function shutdownReadReceiptService(): void {
  readReceiptUnsub?.()
  readReceiptUnsub = null
}
