/**
 * Whiteboard pointer Awareness — publish / apply `whiteboard_awareness` (TASK-262).
 */
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
  decodeWhiteboardAwarenessUpdate,
  isWhiteboardAwarenessPayload,
  whiteboardAwarenessDocIdMatchesGroup,
  whiteboardAwarenessPayloadFromUpdate
} from '../../shared/whiteboard/whiteboardAwareness'
import { WHITEBOARD_IPC } from '../../shared/whiteboard/channels'
import { isAnonymousGroupType } from '../../shared/group/guards'
import { resolveGroupType } from '../group/groupService'
import { getSetupStatus } from '../identity/setup'
import { getNetworkTransport } from '../network'
import { catchSyncFailure } from '../utils/reportSyncFailure'
import { loadOrCreateGroupWhiteboardDoc } from './whiteboardCrdtStore'

export const WHITEBOARD_AWARENESS_REMOTE_ORIGIN = 'remote'

const PUBLISH_THROTTLE_MS = 80

const awarenessByGroup = new Map<string, Awareness>()
const lastPublishAt = new Map<string, number>()
const pendingPublish = new Map<string, ReturnType<typeof setTimeout>>()
const pendingClients = new Map<string, Set<number>>()

function getOrCreateAwareness(db: Database, groupId: string): Awareness | null {
  if (isAnonymousGroupType(resolveGroupType(db, groupId))) return null
  const existing = awarenessByGroup.get(groupId)
  if (existing) return existing
  const doc = loadOrCreateGroupWhiteboardDoc(db, groupId)
  const awareness = new Awareness(doc)
  awarenessByGroup.set(groupId, awareness)
  return awareness
}

async function publishAwarenessUpdate(
  db: Database,
  groupId: string,
  update: Uint8Array
): Promise<void> {
  const transport = getNetworkTransport()
  const status = getSetupStatus(db)
  if (!transport || !status.configured || !status.user || !status.device) return
  if (isAnonymousGroupType(resolveGroupType(db, groupId))) return

  const payload = whiteboardAwarenessPayloadFromUpdate(groupId, update)
  const envelope: SyncEnvelope = {
    version: 1,
    type: 'whiteboard_awareness',
    msgId: `wba_${randomUUID()}`,
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

function broadcastAwareness(groupId: string, updateBase64: string): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(WHITEBOARD_IPC.remoteAwareness, { groupId, updateBase64 })
  }
}

function schedulePublish(
  db: Database,
  groupId: string,
  awareness: Awareness,
  clients: number[]
): void {
  if (clients.length === 0) return
  let set = pendingClients.get(groupId)
  if (!set) {
    set = new Set()
    pendingClients.set(groupId, set)
  }
  for (const c of clients) set.add(c)

  const now = Date.now()
  const last = lastPublishAt.get(groupId) ?? 0
  const wait = Math.max(0, PUBLISH_THROTTLE_MS - (now - last))

  const flush = (): void => {
    pendingPublish.delete(groupId)
    const ids = [...(pendingClients.get(groupId) ?? [])]
    pendingClients.delete(groupId)
    if (ids.length === 0) return
    lastPublishAt.set(groupId, Date.now())
    try {
      const update = encodeAwarenessUpdate(awareness, ids)
      void publishAwarenessUpdate(db, groupId, update).catch(
        catchSyncFailure('whiteboardAwareness.publish', { notify: false })
      )
    } catch {
      /* ignore encode errors */
    }
  }

  const existing = pendingPublish.get(groupId)
  if (existing) clearTimeout(existing)
  pendingPublish.set(groupId, setTimeout(flush, wait))
}

export function ensureWhiteboardAwarenessWired(db: Database, groupId: string): void {
  if (awarenessByGroup.has(groupId)) return
  const awareness = getOrCreateAwareness(db, groupId)
  if (!awareness) return
  awareness.on(
    'update',
    (
      { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
      origin: unknown
    ) => {
      if (origin === WHITEBOARD_AWARENESS_REMOTE_ORIGIN) return
      schedulePublish(db, groupId, awareness, [...added, ...updated, ...removed])
    }
  )
}

export function handleIncomingWhiteboardAwareness(db: Database, envelope: SyncEnvelope): void {
  if (envelope.type !== 'whiteboard_awareness' || !envelope.groupId) return
  const status = getSetupStatus(db)
  if (!status.configured || !status.device) return
  if (envelope.senderDeviceId === status.device.deviceId) return
  if (isAnonymousGroupType(resolveGroupType(db, envelope.groupId))) return
  if (!isWhiteboardAwarenessPayload(envelope.payload)) return
  if (!whiteboardAwarenessDocIdMatchesGroup(envelope.payload.docId, envelope.groupId)) return

  ensureWhiteboardAwarenessWired(db, envelope.groupId)
  const awareness = getOrCreateAwareness(db, envelope.groupId)
  if (!awareness) return
  applyAwarenessUpdate(
    awareness,
    decodeWhiteboardAwarenessUpdate(envelope.payload),
    WHITEBOARD_AWARENESS_REMOTE_ORIGIN
  )
  broadcastAwareness(envelope.groupId, envelope.payload.updateBase64)
}

/** Renderer → main: apply local awareness update and publish. */
export function applyRendererWhiteboardAwareness(
  db: Database,
  groupId: string,
  updateBase64: string
): void {
  if (!groupId || !updateBase64) return
  if (isAnonymousGroupType(resolveGroupType(db, groupId))) return
  ensureWhiteboardAwarenessWired(db, groupId)
  const awareness = getOrCreateAwareness(db, groupId)
  if (!awareness) return
  applyAwarenessUpdate(
    awareness,
    new Uint8Array(Buffer.from(updateBase64, 'base64')),
    'renderer'
  )
}

export function clearWhiteboardAwarenessWiring(): void {
  for (const t of pendingPublish.values()) clearTimeout(t)
  pendingPublish.clear()
  pendingClients.clear()
  lastPublishAt.clear()
  for (const a of awarenessByGroup.values()) {
    a.destroy()
  }
  awarenessByGroup.clear()
}
