import { randomUUID } from 'crypto'
import type { Database } from 'better-sqlite3'
import { BrowserWindow } from 'electron'
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate
} from 'y-protocols/awareness'
import type { SyncEnvelope } from '../../shared/network/types'
import {
  decodeMindmapAwarenessUpdate,
  isMindmapAwarenessPayload,
  mindmapAwarenessDocIdMatches,
  mindmapAwarenessPayloadFromUpdate
} from '../../shared/mindmap/mindmapAwareness'
import { parseMindmapCrdtDocId } from '../../shared/mindmap/mindmapCrdt'
import { MINDMAP_IPC } from '../../shared/mindmap/channels'
import { resolveGroupType } from '../group/groupService'
import { getSetupStatus } from '../identity/setup'
import { getNetworkTransport } from '../network'
import { catchSyncFailure } from '../utils/reportSyncFailure'
import { getMindmapDocument } from '../storage/repositories/mindmapRepository'
import { groupAllowsMindmapCrdt } from './mindmapCrdtPolicy'
import { loadOrCreateMindmapDoc } from './mindmapCrdtStore'

export const MINDMAP_AWARENESS_REMOTE_ORIGIN = 'remote'
const PUBLISH_THROTTLE_MS = 80

const awarenessByDoc = new Map<string, Awareness>()
const lastPublishAt = new Map<string, number>()
const pendingPublish = new Map<string, ReturnType<typeof setTimeout>>()
const pendingClients = new Map<string, Set<number>>()

function getOrCreateAwareness(db: Database, docId: string): Awareness | null {
  const meta = getMindmapDocument(db, docId)
  if (!meta) return null
  if (!groupAllowsMindmapCrdt(meta.groupId, resolveGroupType(db, meta.groupId))) return null
  const existing = awarenessByDoc.get(docId)
  if (existing) return existing
  const ydoc = loadOrCreateMindmapDoc(db, docId)
  if (!ydoc) return null
  const awareness = new Awareness(ydoc)
  awarenessByDoc.set(docId, awareness)
  return awareness
}

async function publishAwarenessUpdate(
  db: Database,
  groupId: string,
  docId: string,
  update: Uint8Array
): Promise<void> {
  const transport = getNetworkTransport()
  const status = getSetupStatus(db)
  if (!transport || !status.configured || !status.user || !status.device) return
  if (!groupAllowsMindmapCrdt(groupId, resolveGroupType(db, groupId))) return

  const payload = mindmapAwarenessPayloadFromUpdate(docId, update)
  const envelope: SyncEnvelope = {
    version: 1,
    type: 'mindmap_awareness',
    msgId: `mma_${randomUUID()}`,
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

function broadcastAwareness(groupId: string, docId: string, updateBase64: string): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(MINDMAP_IPC.remoteAwareness, { groupId, docId, updateBase64 })
  }
}

function schedulePublish(
  db: Database,
  groupId: string,
  docId: string,
  awareness: Awareness,
  clients: number[]
): void {
  if (clients.length === 0) return
  let set = pendingClients.get(docId)
  if (!set) {
    set = new Set()
    pendingClients.set(docId, set)
  }
  for (const c of clients) set.add(c)

  const now = Date.now()
  const last = lastPublishAt.get(docId) ?? 0
  const wait = Math.max(0, PUBLISH_THROTTLE_MS - (now - last))

  const flush = (): void => {
    pendingPublish.delete(docId)
    const ids = [...(pendingClients.get(docId) ?? [])]
    pendingClients.delete(docId)
    if (ids.length === 0) return
    lastPublishAt.set(docId, Date.now())
    try {
      const update = encodeAwarenessUpdate(awareness, ids)
      void publishAwarenessUpdate(db, groupId, docId, update).catch(
        catchSyncFailure('mindmapAwareness.publish', { notify: false })
      )
    } catch {
      /* ignore */
    }
  }

  const existing = pendingPublish.get(docId)
  if (existing) clearTimeout(existing)
  pendingPublish.set(docId, setTimeout(flush, wait))
}

export function ensureMindmapAwarenessWired(db: Database, docId: string): void {
  if (awarenessByDoc.has(docId)) return
  const meta = getMindmapDocument(db, docId)
  if (!meta) return
  const awareness = getOrCreateAwareness(db, docId)
  if (!awareness) return
  awareness.on(
    'update',
    (
      { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
      origin: unknown
    ) => {
      if (origin === MINDMAP_AWARENESS_REMOTE_ORIGIN) return
      schedulePublish(db, meta.groupId, docId, awareness, [...added, ...updated, ...removed])
    }
  )
}

export function handleIncomingMindmapAwareness(db: Database, envelope: SyncEnvelope): void {
  if (envelope.type !== 'mindmap_awareness' || !envelope.groupId) return
  const status = getSetupStatus(db)
  if (!status.configured || !status.device) return
  if (envelope.senderDeviceId === status.device.deviceId) return
  if (!groupAllowsMindmapCrdt(envelope.groupId, resolveGroupType(db, envelope.groupId))) return
  if (!isMindmapAwarenessPayload(envelope.payload)) return
  const localDocId = parseMindmapCrdtDocId(envelope.payload.docId)
  if (!localDocId) return
  const meta = getMindmapDocument(db, localDocId)
  if (!meta || meta.groupId !== envelope.groupId) return
  if (!mindmapAwarenessDocIdMatches(envelope.payload.docId, localDocId)) return

  ensureMindmapAwarenessWired(db, localDocId)
  const awareness = getOrCreateAwareness(db, localDocId)
  if (!awareness) return
  applyAwarenessUpdate(
    awareness,
    decodeMindmapAwarenessUpdate(envelope.payload),
    MINDMAP_AWARENESS_REMOTE_ORIGIN
  )
  broadcastAwareness(envelope.groupId, localDocId, envelope.payload.updateBase64)
}

export function applyRendererMindmapAwareness(
  db: Database,
  docId: string,
  updateBase64: string
): void {
  if (!docId || !updateBase64) return
  const meta = getMindmapDocument(db, docId)
  if (!meta) return
  if (!groupAllowsMindmapCrdt(meta.groupId, resolveGroupType(db, meta.groupId))) return
  ensureMindmapAwarenessWired(db, docId)
  const awareness = getOrCreateAwareness(db, docId)
  if (!awareness) return
  applyAwarenessUpdate(
    awareness,
    new Uint8Array(Buffer.from(updateBase64, 'base64')),
    'renderer'
  )
}

export function clearMindmapAwarenessWiring(): void {
  for (const t of pendingPublish.values()) clearTimeout(t)
  pendingPublish.clear()
  pendingClients.clear()
  lastPublishAt.clear()
  for (const a of awarenessByDoc.values()) a.destroy()
  awarenessByDoc.clear()
}
