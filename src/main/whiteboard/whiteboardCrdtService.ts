/**
 * Realtime whiteboard_crdt publish / apply (TASK-260).
 */
import { randomUUID } from 'crypto'
import type { Database } from 'better-sqlite3'
import { BrowserWindow } from 'electron'
import type { SyncEnvelope } from '../../shared/network/types'
import {
  decodeWhiteboardCrdtUpdate,
  isWhiteboardCrdtPayload,
  whiteboardCrdtDocIdMatchesGroup,
  whiteboardCrdtPayloadFromUpdate
} from '../../shared/whiteboard/whiteboardCrdt'
import { applyWhiteboardEncodedUpdate } from '../../shared/whiteboard/whiteboardCrdtModel'
import { WHITEBOARD_IPC } from '../../shared/whiteboard/channels'
import { isAnonymousGroupType } from '../../shared/group/guards'
import { resolveGroupType } from '../group/groupService'
import { getSetupStatus } from '../identity/setup'
import { getNetworkTransport } from '../network'
import { catchSyncFailure } from '../utils/reportSyncFailure'
import {
  evictGroupWhiteboardDoc,
  loadOrCreateGroupWhiteboardDoc,
  persistGroupWhiteboardDoc
} from './whiteboardCrdtStore'

export const WHITEBOARD_CRDT_REMOTE_ORIGIN = 'remote'
export const WHITEBOARD_CRDT_RENDERER_ORIGIN = 'renderer'

const wiredGroups = new Set<string>()

type DocChangedFn = (groupId: string, updateBase64: string) => void
let onDocChanged: DocChangedFn | null = null

export function setWhiteboardCrdtDocChangedHandler(handler: DocChangedFn | null): void {
  onDocChanged = handler
}

export function broadcastWhiteboardRemoteUpdate(groupId: string, updateBase64: string): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(WHITEBOARD_IPC.remoteUpdate, { groupId, updateBase64 })
  }
  onDocChanged?.(groupId, updateBase64)
}

async function publishUpdate(db: Database, groupId: string, update: Uint8Array): Promise<void> {
  const transport = getNetworkTransport()
  const status = getSetupStatus(db)
  if (!transport || !status.configured || !status.user || !status.device) return
  if (isAnonymousGroupType(resolveGroupType(db, groupId))) return

  const payload = whiteboardCrdtPayloadFromUpdate(groupId, update)
  const envelope: SyncEnvelope = {
    version: 1,
    type: 'whiteboard_crdt',
    msgId: `wbc_${randomUUID()}`,
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

export function ensureWhiteboardCrdtWired(db: Database, groupId: string): void {
  if (wiredGroups.has(groupId)) {
    loadOrCreateGroupWhiteboardDoc(db, groupId)
    return
  }
  if (isAnonymousGroupType(resolveGroupType(db, groupId))) return

  const doc = loadOrCreateGroupWhiteboardDoc(db, groupId)
  doc.on('update', (update: Uint8Array, origin: unknown) => {
    if (
      origin === WHITEBOARD_CRDT_REMOTE_ORIGIN ||
      origin === 'load' ||
      origin === 'seed' ||
      origin === 'asset-guard'
    ) {
      return
    }
    persistGroupWhiteboardDoc(db, groupId, doc)
    // Renderer-origin updates: publish P2P but do not echo IPC (renderer already has it)
    if (origin === WHITEBOARD_CRDT_RENDERER_ORIGIN) {
      void publishUpdate(db, groupId, update).catch(
        catchSyncFailure('whiteboardCrdt.publish', { messageKey: 'sync.taskPublishFailed' })
      )
      return
    }
    // Main-local mutations (if any)
    const updateBase64 = Buffer.from(update).toString('base64')
    broadcastWhiteboardRemoteUpdate(groupId, updateBase64)
    void publishUpdate(db, groupId, update).catch(
      catchSyncFailure('whiteboardCrdt.publish', { messageKey: 'sync.taskPublishFailed' })
    )
  })
  wiredGroups.add(groupId)
}

export function handleIncomingWhiteboardCrdt(db: Database, envelope: SyncEnvelope): void {
  if (envelope.type !== 'whiteboard_crdt' || !envelope.groupId) return
  const status = getSetupStatus(db)
  if (!status.configured || !status.device) return
  if (envelope.senderDeviceId === status.device.deviceId) return
  if (isAnonymousGroupType(resolveGroupType(db, envelope.groupId))) return
  if (!isWhiteboardCrdtPayload(envelope.payload)) return

  const payload = envelope.payload
  if (!whiteboardCrdtDocIdMatchesGroup(payload.docId, envelope.groupId)) return

  ensureWhiteboardCrdtWired(db, envelope.groupId)
  const doc = loadOrCreateGroupWhiteboardDoc(db, envelope.groupId)
  applyWhiteboardEncodedUpdate(doc, decodeWhiteboardCrdtUpdate(payload), WHITEBOARD_CRDT_REMOTE_ORIGIN)
  persistGroupWhiteboardDoc(db, envelope.groupId, doc)
  broadcastWhiteboardRemoteUpdate(envelope.groupId, payload.updateBase64)
}

/** Renderer local Yjs update → apply on main Doc (triggers publish via observer). */
export function applyRendererWhiteboardUpdate(
  db: Database,
  groupId: string,
  updateBase64: string
): void {
  if (!groupId || !updateBase64) return
  if (isAnonymousGroupType(resolveGroupType(db, groupId))) return
  ensureWhiteboardCrdtWired(db, groupId)
  const doc = loadOrCreateGroupWhiteboardDoc(db, groupId)
  applyWhiteboardEncodedUpdate(
    doc,
    new Uint8Array(Buffer.from(updateBase64, 'base64')),
    WHITEBOARD_CRDT_RENDERER_ORIGIN
  )
}

export function clearWhiteboardCrdtWiring(): void {
  for (const groupId of wiredGroups) {
    evictGroupWhiteboardDoc(groupId)
  }
  wiredGroups.clear()
}
