import { randomUUID } from 'crypto'
import type { Database } from 'better-sqlite3'
import type { SyncEnvelope } from '../../shared/network/types'
import {
  decodeMindmapCrdtUpdate,
  decodeMindmapStateVectorBase64,
  encodeMindmapStateVectorBase64,
  isMindmapCrdtSyncBatchPayload,
  isMindmapCrdtSyncRequestPayload,
  mindmapCrdtDocId,
  mindmapCrdtDocIdMatches,
  parseMindmapCrdtDocId,
  type MindmapCrdtSyncBatchPayload,
  type MindmapCrdtSyncRequestPayload
} from '../../shared/mindmap/mindmapCrdt'
import {
  applyMindmapEncodedUpdate,
  encodeMindmapDocStateAsUpdate,
  encodeMindmapDocStateVector
} from '../../shared/mindmap/mindmapCrdtModel'
import { listUserGroups, resolveGroupType } from '../group/groupService'
import { getSetupStatus } from '../identity/setup'
import { getNetworkTransport } from '../network'
import { catchSyncFailure } from '../utils/reportSyncFailure'
import { getMindmapDocument, listAllMindmapDocuments } from '../storage/repositories/mindmapRepository'
import { groupAllowsMindmapCrdt } from './mindmapCrdtPolicy'
import {
  broadcastMindmapRemoteUpdate,
  ensureMindmapCrdtWired,
  MINDMAP_CRDT_REMOTE_ORIGIN
} from './mindmapCrdtService'
import { loadOrCreateMindmapDoc, persistMindmapDoc } from './mindmapCrdtStore'

async function publishCrdtSyncRequest(
  db: Database,
  groupId: string,
  docId: string,
  stateVectorBase64: string
): Promise<void> {
  const transport = getNetworkTransport()
  const status = getSetupStatus(db)
  if (!transport || !status.configured || !status.user || !status.device) return

  const payload: MindmapCrdtSyncRequestPayload = {
    docId: mindmapCrdtDocId(docId),
    stateVectorBase64
  }
  const envelope: SyncEnvelope = {
    version: 1,
    type: 'mindmap_crdt_sync_request',
    msgId: `mmc_sync_req_${docId}_${Date.now()}`,
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

export async function requestMindmapCrdtOfflineSync(db: Database): Promise<void> {
  const transport = getNetworkTransport()
  const status = getSetupStatus(db)
  if (!transport || !status.configured || !status.user || !status.device) return

  const allowed = new Set(
    listUserGroups(db)
      .filter((g) => groupAllowsMindmapCrdt(g.groupId, resolveGroupType(db, g.groupId)))
      .map((g) => g.groupId)
  )
  for (const doc of listAllMindmapDocuments(db)) {
    if (!allowed.has(doc.groupId)) continue
    ensureMindmapCrdtWired(db, doc.docId)
    const ydoc = loadOrCreateMindmapDoc(db, doc.docId)
    if (!ydoc) continue
    const sv = encodeMindmapDocStateVector(ydoc)
    await publishCrdtSyncRequest(db, doc.groupId, doc.docId, encodeMindmapStateVectorBase64(sv))
  }
}

export async function handleMindmapCrdtSyncRequest(
  db: Database,
  envelope: SyncEnvelope
): Promise<void> {
  if (envelope.type !== 'mindmap_crdt_sync_request' || !envelope.groupId) return
  const status = getSetupStatus(db)
  if (!status.configured || !status.user || !status.device) return
  if (envelope.senderDeviceId === status.device.deviceId) return
  if (!groupAllowsMindmapCrdt(envelope.groupId, resolveGroupType(db, envelope.groupId))) return
  if (!isMindmapCrdtSyncRequestPayload(envelope.payload)) return
  const localDocId = parseMindmapCrdtDocId(envelope.payload.docId)
  if (!localDocId) return
  const meta = getMindmapDocument(db, localDocId)
  if (!meta || meta.groupId !== envelope.groupId) return
  if (!mindmapCrdtDocIdMatches(envelope.payload.docId, localDocId)) return

  const transport = getNetworkTransport()
  if (!transport) return

  ensureMindmapCrdtWired(db, localDocId)
  const doc = loadOrCreateMindmapDoc(db, localDocId)
  if (!doc) return
  const remoteSv = decodeMindmapStateVectorBase64(envelope.payload.stateVectorBase64)
  const update = encodeMindmapDocStateAsUpdate(doc, remoteSv)
  if (update.byteLength === 0) return

  const batch: MindmapCrdtSyncBatchPayload = {
    docId: mindmapCrdtDocId(localDocId),
    updateBase64: Buffer.from(update).toString('base64')
  }
  const response: SyncEnvelope = {
    version: 1,
    type: 'mindmap_crdt_sync_batch',
    msgId: `mmc_sync_batch_${localDocId}_${randomUUID()}`,
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

export function handleMindmapCrdtSyncBatch(db: Database, envelope: SyncEnvelope): void {
  if (envelope.type !== 'mindmap_crdt_sync_batch' || !envelope.groupId) return
  const status = getSetupStatus(db)
  if (!status.configured || !status.device) return
  if (envelope.senderDeviceId === status.device.deviceId) return
  if (!groupAllowsMindmapCrdt(envelope.groupId, resolveGroupType(db, envelope.groupId))) return
  if (!isMindmapCrdtSyncBatchPayload(envelope.payload)) return
  const localDocId = parseMindmapCrdtDocId(envelope.payload.docId)
  if (!localDocId) return
  const meta = getMindmapDocument(db, localDocId)
  if (!meta || meta.groupId !== envelope.groupId) return
  if (!mindmapCrdtDocIdMatches(envelope.payload.docId, localDocId)) return

  ensureMindmapCrdtWired(db, localDocId)
  const doc = loadOrCreateMindmapDoc(db, localDocId)
  if (!doc) return
  applyMindmapEncodedUpdate(
    doc,
    decodeMindmapCrdtUpdate(envelope.payload),
    MINDMAP_CRDT_REMOTE_ORIGIN
  )
  persistMindmapDoc(db, localDocId, doc)
  broadcastMindmapRemoteUpdate(envelope.groupId, localDocId, envelope.payload.updateBase64)
}

export function wireMindmapCrdtOfflineSync(db: Database): void {
  void requestMindmapCrdtOfflineSync(db).catch(
    catchSyncFailure('mindmapCrdt.requestOffline', { notify: false })
  )
}
