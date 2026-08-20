import { randomUUID } from 'crypto'
import type { Database } from 'better-sqlite3'
import { BrowserWindow } from 'electron'
import type { SyncEnvelope } from '../../shared/network/types'
import {
  decodeMindmapCrdtUpdate,
  isMindmapCrdtPayload,
  mindmapCrdtDocIdMatches,
  mindmapCrdtPayloadFromUpdate,
  parseMindmapCrdtDocId
} from '../../shared/mindmap/mindmapCrdt'
import { applyMindmapEncodedUpdate } from '../../shared/mindmap/mindmapCrdtModel'
import { MINDMAP_IPC } from '../../shared/mindmap/channels'
import { resolveGroupType } from '../group/groupService'
import { getSetupStatus } from '../identity/setup'
import { getNetworkTransport } from '../network'
import { catchSyncFailure } from '../utils/reportSyncFailure'
import { getMindmapDocument } from '../storage/repositories/mindmapRepository'
import { groupAllowsMindmapCrdt } from './mindmapCrdtPolicy'
import {
  evictMindmapDoc,
  loadOrCreateMindmapDoc,
  persistMindmapDoc
} from './mindmapCrdtStore'

export const MINDMAP_CRDT_REMOTE_ORIGIN = 'remote'
export const MINDMAP_CRDT_RENDERER_ORIGIN = 'renderer'

const wiredDocs = new Set<string>()

export function broadcastMindmapRemoteUpdate(
  groupId: string,
  docId: string,
  updateBase64: string
): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(MINDMAP_IPC.remoteUpdate, { groupId, docId, updateBase64 })
  }
}

async function publishUpdate(db: Database, groupId: string, docId: string, update: Uint8Array): Promise<void> {
  const transport = getNetworkTransport()
  const status = getSetupStatus(db)
  if (!transport || !status.configured || !status.user || !status.device) return
  if (!groupAllowsMindmapCrdt(groupId, resolveGroupType(db, groupId))) return

  const payload = mindmapCrdtPayloadFromUpdate(docId, update)
  const envelope: SyncEnvelope = {
    version: 1,
    type: 'mindmap_crdt',
    msgId: `mmc_${randomUUID()}`,
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

export function ensureMindmapCrdtWired(db: Database, docId: string): void {
  const meta = getMindmapDocument(db, docId)
  if (!meta) return
  if (!groupAllowsMindmapCrdt(meta.groupId, resolveGroupType(db, meta.groupId))) return
  if (wiredDocs.has(docId)) {
    loadOrCreateMindmapDoc(db, docId)
    return
  }
  const doc = loadOrCreateMindmapDoc(db, docId)
  if (!doc) return
  doc.on('update', (update: Uint8Array, origin: unknown) => {
    if (
      origin === MINDMAP_CRDT_REMOTE_ORIGIN ||
      origin === 'load' ||
      origin === 'seed'
    ) {
      return
    }
    persistMindmapDoc(db, docId, doc)
    if (origin === MINDMAP_CRDT_RENDERER_ORIGIN) {
      void publishUpdate(db, meta.groupId, docId, update).catch(
        catchSyncFailure('mindmapCrdt.publish', { messageKey: 'sync.taskPublishFailed' })
      )
      return
    }
    const updateBase64 = Buffer.from(update).toString('base64')
    broadcastMindmapRemoteUpdate(meta.groupId, docId, updateBase64)
    void publishUpdate(db, meta.groupId, docId, update).catch(
      catchSyncFailure('mindmapCrdt.publish', { messageKey: 'sync.taskPublishFailed' })
    )
  })
  wiredDocs.add(docId)
}

export function handleIncomingMindmapCrdt(db: Database, envelope: SyncEnvelope): void {
  if (envelope.type !== 'mindmap_crdt' || !envelope.groupId) return
  const status = getSetupStatus(db)
  if (!status.configured || !status.device) return
  if (envelope.senderDeviceId === status.device.deviceId) return
  if (!groupAllowsMindmapCrdt(envelope.groupId, resolveGroupType(db, envelope.groupId))) return
  if (!isMindmapCrdtPayload(envelope.payload)) return
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

export function applyRendererMindmapUpdate(
  db: Database,
  docId: string,
  updateBase64: string
): void {
  if (!docId || !updateBase64) return
  const meta = getMindmapDocument(db, docId)
  if (!meta) return
  if (!groupAllowsMindmapCrdt(meta.groupId, resolveGroupType(db, meta.groupId))) return
  ensureMindmapCrdtWired(db, docId)
  const doc = loadOrCreateMindmapDoc(db, docId)
  if (!doc) return
  applyMindmapEncodedUpdate(
    doc,
    new Uint8Array(Buffer.from(updateBase64, 'base64')),
    MINDMAP_CRDT_RENDERER_ORIGIN
  )
}

export function clearMindmapCrdtWiring(): void {
  for (const docId of wiredDocs) evictMindmapDoc(docId)
  wiredDocs.clear()
}
