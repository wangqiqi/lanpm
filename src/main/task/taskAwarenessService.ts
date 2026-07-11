/**
 * Yjs Awareness focus Presence — publish / apply `task_awareness` (TASK-178).
 * Ephemeral; not persisted to SQLite.
 */
import { randomUUID } from 'crypto'
import type { Database } from 'better-sqlite3'
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate
} from 'y-protocols/awareness'
import type { SyncEnvelope } from '../../shared/network/types'
import {
  decodeTaskAwarenessUpdate,
  isTaskAwarenessLocalState,
  isTaskAwarenessPayload,
  taskAwarenessDocIdMatchesGroup,
  taskAwarenessPayloadFromUpdate,
  type TaskAwarenessLocalState
} from '../../shared/task/taskAwareness'
import { isAnonymousGroupType } from '../../shared/group/guards'
import { resolveGroupType } from '../group/groupService'
import { getSetupStatus } from '../identity/setup'
import { getNetworkTransport } from '../network'
import { catchSyncFailure } from '../utils/reportSyncFailure'
import { loadOrCreateGroupTaskDoc } from './taskCrdtStore'

export const TASK_AWARENESS_REMOTE_ORIGIN = 'remote'

/** Min interval between awareness publishes per group (ms). */
const PUBLISH_THROTTLE_MS = 200

const awarenessByGroup = new Map<string, Awareness>()
const lastPublishAt = new Map<string, number>()
const pendingPublish = new Map<string, ReturnType<typeof setTimeout>>()
const pendingClients = new Map<string, Set<number>>()

type AwarenessChangedFn = (groupId: string) => void
let onAwarenessChanged: AwarenessChangedFn | null = null

export function setTaskAwarenessChangedHandler(handler: AwarenessChangedFn | null): void {
  onAwarenessChanged = handler
}

function getOrCreateAwareness(db: Database, groupId: string): Awareness | null {
  if (isAnonymousGroupType(resolveGroupType(db, groupId))) return null
  const existing = awarenessByGroup.get(groupId)
  if (existing) return existing
  const doc = loadOrCreateGroupTaskDoc(db, groupId)
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

  const payload = taskAwarenessPayloadFromUpdate(groupId, update)
  const envelope: SyncEnvelope = {
    version: 1,
    type: 'task_awareness',
    msgId: `ta_${randomUUID()}`,
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
    const update = encodeAwarenessUpdate(awareness, ids)
    void publishAwarenessUpdate(db, groupId, update).catch(
      catchSyncFailure('taskAwareness.publish', { messageKey: 'sync.taskPublishFailed' })
    )
  }

  const existing = pendingPublish.get(groupId)
  if (existing) clearTimeout(existing)
  if (wait === 0) {
    flush()
  } else {
    pendingPublish.set(groupId, setTimeout(flush, wait))
  }
}

/**
 * Ensure Awareness is attached to the group Y.Doc and local changes are published.
 */
export function ensureTaskAwarenessWired(db: Database, groupId: string): void {
  if (awarenessByGroup.has(groupId)) {
    getOrCreateAwareness(db, groupId)
    return
  }
  if (isAnonymousGroupType(resolveGroupType(db, groupId))) return

  const awareness = getOrCreateAwareness(db, groupId)
  if (!awareness) return

  awareness.on(
    'update',
    (
      {
        added,
        updated,
        removed
      }: { added: number[]; updated: number[]; removed: number[] },
      origin: unknown
    ) => {
      if (origin === TASK_AWARENESS_REMOTE_ORIGIN) {
        onAwarenessChanged?.(groupId)
        return
      }
      const clients = added.concat(updated).concat(removed)
      schedulePublish(db, groupId, awareness, clients)
      onAwarenessChanged?.(groupId)
    }
  )
}

export function handleIncomingTaskAwareness(db: Database, envelope: SyncEnvelope): void {
  if (envelope.type !== 'task_awareness' || !envelope.groupId) return
  const status = getSetupStatus(db)
  if (!status.configured || !status.device) return
  if (envelope.senderDeviceId === status.device.deviceId) return
  if (isAnonymousGroupType(resolveGroupType(db, envelope.groupId))) return
  if (!isTaskAwarenessPayload(envelope.payload)) return

  const payload = envelope.payload
  if (!taskAwarenessDocIdMatchesGroup(payload.docId, envelope.groupId)) return

  ensureTaskAwarenessWired(db, envelope.groupId)
  const awareness = awarenessByGroup.get(envelope.groupId)
  if (!awareness) return

  applyAwarenessUpdate(
    awareness,
    decodeTaskAwarenessUpdate(payload),
    TASK_AWARENESS_REMOTE_ORIGIN
  )
}

/** Set or clear local focus Presence for a group. */
export function setLocalTaskAwareness(
  db: Database,
  groupId: string,
  state: TaskAwarenessLocalState | null
): void {
  if (state !== null && !isTaskAwarenessLocalState(state)) return
  ensureTaskAwarenessWired(db, groupId)
  const awareness = awarenessByGroup.get(groupId)
  if (!awareness) return
  awareness.setLocalState(state)
}

/** Snapshot of remote peers' focus states (excludes local client). */
export function listRemoteTaskAwareness(
  groupId: string
): Array<TaskAwarenessLocalState & { clientId: number }> {
  const awareness = awarenessByGroup.get(groupId)
  if (!awareness) return []
  const out: Array<TaskAwarenessLocalState & { clientId: number }> = []
  for (const [clientId, raw] of awareness.getStates()) {
    if (clientId === awareness.clientID) continue
    if (!isTaskAwarenessLocalState(raw)) continue
    out.push({ ...raw, clientId })
  }
  return out
}

export function clearTaskAwarenessWiring(): void {
  for (const t of pendingPublish.values()) clearTimeout(t)
  pendingPublish.clear()
  pendingClients.clear()
  lastPublishAt.clear()
  for (const awareness of awarenessByGroup.values()) {
    awareness.destroy()
  }
  awarenessByGroup.clear()
}

/** Test helper */
export function clearTaskAwarenessCache(): void {
  clearTaskAwarenessWiring()
}
