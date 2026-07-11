/**
 * Yjs whiteboard_crdt offline catch-up via state vector (TASK-260).
 */
import { randomUUID } from 'crypto'
import type { Database } from 'better-sqlite3'
import type { SyncEnvelope } from '../../shared/network/types'
import {
  decodeWhiteboardCrdtUpdate,
  decodeWhiteboardStateVectorBase64,
  encodeWhiteboardStateVectorBase64,
  isWhiteboardCrdtSyncBatchPayload,
  isWhiteboardCrdtSyncRequestPayload,
  whiteboardCrdtDocId,
  whiteboardCrdtDocIdMatchesGroup,
  type WhiteboardCrdtSyncBatchPayload,
  type WhiteboardCrdtSyncRequestPayload
} from '../../shared/whiteboard/whiteboardCrdt'
import {
  applyWhiteboardEncodedUpdate,
  encodeWhiteboardDocStateAsUpdate,
  encodeWhiteboardDocStateVector
} from '../../shared/whiteboard/whiteboardCrdtModel'
import { isAnonymousGroupType } from '../../shared/group/guards'
import { listUserGroups, resolveGroupType } from '../group/groupService'
import { getSetupStatus } from '../identity/setup'
import { getNetworkTransport } from '../network'
import { catchSyncFailure } from '../utils/reportSyncFailure'
import {
  broadcastWhiteboardRemoteUpdate,
  ensureWhiteboardCrdtWired,
  WHITEBOARD_CRDT_REMOTE_ORIGIN
} from './whiteboardCrdtService'
import { loadOrCreateGroupWhiteboardDoc, persistGroupWhiteboardDoc } from './whiteboardCrdtStore'

function groupAllowsWhiteboardCrdt(
  groupId: string,
  type: ReturnType<typeof resolveGroupType>
): boolean {
  if (groupId.startsWith('dm:')) return false
  if (isAnonymousGroupType(type) || type === 'function') return false
  return true
}

async function publishCrdtSyncRequest(
  db: Database,
  groupId: string,
  stateVectorBase64: string
): Promise<void> {
  const transport = getNetworkTransport()
  const status = getSetupStatus(db)
  if (!transport || !status.configured || !status.user || !status.device) return

  const payload: WhiteboardCrdtSyncRequestPayload = {
    docId: whiteboardCrdtDocId(groupId),
    stateVectorBase64
  }
  const envelope: SyncEnvelope = {
    version: 1,
    type: 'whiteboard_crdt_sync_request',
    msgId: `wbc_sync_req_${groupId}_${Date.now()}`,
    senderUserId: status.user.userId,
    senderDeviceId: status.device.deviceId,
    groupId,
    ts: new Date().toISOString(),
    payload,
    nonce: '',
    authTag: ''
  }
  await transport.publish(envelope)
}

export async function requestWhiteboardCrdtOfflineSync(db: Database): Promise<void> {
  const transport = getNetworkTransport()
  const status = getSetupStatus(db)
  if (!transport || !status.configured || !status.user || !status.device) return

  for (const group of listUserGroups(db)) {
    const type = resolveGroupType(db, group.groupId)
    if (!groupAllowsWhiteboardCrdt(group.groupId, type)) continue
    ensureWhiteboardCrdtWired(db, group.groupId)
    const doc = loadOrCreateGroupWhiteboardDoc(db, group.groupId)
    const sv = encodeWhiteboardDocStateVector(doc)
    await publishCrdtSyncRequest(db, group.groupId, encodeWhiteboardStateVectorBase64(sv))
  }
}

export async function handleWhiteboardCrdtSyncRequest(
  db: Database,
  envelope: SyncEnvelope
): Promise<void> {
  if (envelope.type !== 'whiteboard_crdt_sync_request' || !envelope.groupId) return
  const status = getSetupStatus(db)
  if (!status.configured || !status.user || !status.device) return
  if (envelope.senderDeviceId === status.device.deviceId) return
  if (!groupAllowsWhiteboardCrdt(envelope.groupId, resolveGroupType(db, envelope.groupId))) return
  if (!isWhiteboardCrdtSyncRequestPayload(envelope.payload)) return
  if (!whiteboardCrdtDocIdMatchesGroup(envelope.payload.docId, envelope.groupId)) return

  const transport = getNetworkTransport()
  if (!transport) return

  ensureWhiteboardCrdtWired(db, envelope.groupId)
  const doc = loadOrCreateGroupWhiteboardDoc(db, envelope.groupId)
  const remoteSv = decodeWhiteboardStateVectorBase64(envelope.payload.stateVectorBase64)
  const update = encodeWhiteboardDocStateAsUpdate(doc, remoteSv)
  if (update.byteLength === 0) return

  const batch: WhiteboardCrdtSyncBatchPayload = {
    docId: whiteboardCrdtDocId(envelope.groupId),
    updateBase64: Buffer.from(update).toString('base64')
  }
  const response: SyncEnvelope = {
    version: 1,
    type: 'whiteboard_crdt_sync_batch',
    msgId: `wbc_sync_batch_${envelope.groupId}_${randomUUID()}`,
    senderUserId: status.user.userId,
    senderDeviceId: status.device.deviceId,
    groupId: envelope.groupId,
    ts: new Date().toISOString(),
    payload: batch,
    nonce: '',
    authTag: ''
  }
  await transport.publish(response)
}

export function handleWhiteboardCrdtSyncBatch(db: Database, envelope: SyncEnvelope): void {
  if (envelope.type !== 'whiteboard_crdt_sync_batch' || !envelope.groupId) return
  const status = getSetupStatus(db)
  if (!status.configured || !status.device) return
  if (envelope.senderDeviceId === status.device.deviceId) return
  if (!groupAllowsWhiteboardCrdt(envelope.groupId, resolveGroupType(db, envelope.groupId))) return
  if (!isWhiteboardCrdtSyncBatchPayload(envelope.payload)) return
  if (!whiteboardCrdtDocIdMatchesGroup(envelope.payload.docId, envelope.groupId)) return

  ensureWhiteboardCrdtWired(db, envelope.groupId)
  const doc = loadOrCreateGroupWhiteboardDoc(db, envelope.groupId)
  applyWhiteboardEncodedUpdate(
    doc,
    decodeWhiteboardCrdtUpdate(envelope.payload),
    WHITEBOARD_CRDT_REMOTE_ORIGIN
  )
  persistGroupWhiteboardDoc(db, envelope.groupId, doc)
  broadcastWhiteboardRemoteUpdate(envelope.groupId, envelope.payload.updateBase64)
}

export function wireWhiteboardCrdtOfflineSync(db: Database): void {
  void requestWhiteboardCrdtOfflineSync(db).catch(
    catchSyncFailure('whiteboardCrdt.requestOffline', { notify: false })
  )
}
