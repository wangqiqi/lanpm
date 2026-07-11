/**
 * Realtime task_crdt publish / apply (TASK-159).
 * Dual-write to SQLite via task_patch remains TASK-160.
 */
import { randomUUID } from 'crypto'
import type { Database } from 'better-sqlite3'
import type { SyncEnvelope } from '../../shared/network/types'
import {
  decodeTaskCrdtUpdate,
  isTaskCrdtPayload,
  taskCrdtDocIdMatchesGroup,
  taskCrdtPayloadFromUpdate
} from '../../shared/task/taskCrdt'
import { applyEncodedUpdate } from '../../shared/task/taskCrdtModel'
import { isAnonymousGroupType } from '../../shared/group/guards'
import { resolveGroupType } from '../group/groupService'
import { getSetupStatus } from '../identity/setup'
import { getNetworkTransport } from '../network'
import { catchSyncFailure } from '../utils/reportSyncFailure'
import {
  evictGroupTaskDoc,
  loadOrCreateGroupTaskDoc,
  persistGroupTaskDoc
} from './taskCrdtStore'

/** Yjs update origin — skip re-publish */
export const TASK_CRDT_REMOTE_ORIGIN = 'remote'

const wiredGroups = new Set<string>()

type TasksChangedFn = (groupId: string) => void

let onTasksChanged: TasksChangedFn | null = null

export function setTaskCrdtTasksChangedHandler(handler: TasksChangedFn | null): void {
  onTasksChanged = handler
}

async function publishUpdate(db: Database, groupId: string, update: Uint8Array): Promise<void> {
  const transport = getNetworkTransport()
  const status = getSetupStatus(db)
  if (!transport || !status.configured || !status.user || !status.device) return
  if (isAnonymousGroupType(resolveGroupType(db, groupId))) return

  const payload = taskCrdtPayloadFromUpdate(groupId, update)
  const envelope: SyncEnvelope = {
    version: 1,
    type: 'task_crdt',
    msgId: `tc_${randomUUID()}`,
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

/**
 * Ensure Y.Doc is loaded and local updates are published as task_crdt.
 * Call after subscribe / before local CRDT edits.
 */
export function ensureTaskCrdtWired(db: Database, groupId: string): void {
  if (wiredGroups.has(groupId)) {
    loadOrCreateGroupTaskDoc(db, groupId)
    return
  }
  if (isAnonymousGroupType(resolveGroupType(db, groupId))) return

  const doc = loadOrCreateGroupTaskDoc(db, groupId)
  doc.on('update', (update: Uint8Array, origin: unknown) => {
    if (origin === TASK_CRDT_REMOTE_ORIGIN || origin === 'load' || origin === 'seed') return
    persistGroupTaskDoc(db, groupId, doc)
    void publishUpdate(db, groupId, update).catch(
      catchSyncFailure('taskCrdt.publish', { messageKey: 'sync.taskPublishFailed' })
    )
  })
  wiredGroups.add(groupId)
}

export function handleIncomingTaskCrdt(db: Database, envelope: SyncEnvelope): void {
  if (envelope.type !== 'task_crdt' || !envelope.groupId) return
  const status = getSetupStatus(db)
  if (!status.configured || !status.device) return
  if (envelope.senderDeviceId === status.device.deviceId) return
  if (isAnonymousGroupType(resolveGroupType(db, envelope.groupId))) return
  if (!isTaskCrdtPayload(envelope.payload)) return

  const payload = envelope.payload
  if (!taskCrdtDocIdMatchesGroup(payload.docId, envelope.groupId)) return

  ensureTaskCrdtWired(db, envelope.groupId)
  const doc = loadOrCreateGroupTaskDoc(db, envelope.groupId)
  applyEncodedUpdate(doc, decodeTaskCrdtUpdate(payload), TASK_CRDT_REMOTE_ORIGIN)
  persistGroupTaskDoc(db, envelope.groupId, doc)
  onTasksChanged?.(envelope.groupId)
}

export function clearTaskCrdtWiring(): void {
  for (const groupId of wiredGroups) {
    evictGroupTaskDoc(groupId)
  }
  wiredGroups.clear()
}

/** Apply a local task field change into Y.Doc (triggers publish via observer). */
export function applyLocalTaskCrdtEdit(
  db: Database,
  groupId: string,
  mutate: (doc: import('yjs').Doc) => void
): void {
  ensureTaskCrdtWired(db, groupId)
  const doc = loadOrCreateGroupTaskDoc(db, groupId)
  doc.transact(() => mutate(doc), 'local')
}
