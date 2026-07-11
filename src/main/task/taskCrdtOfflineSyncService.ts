/**
 * Yjs task_crdt offline catch-up via state vector (TASK-161).
 * Request carries local SV; peer replies with encodeStateAsUpdate(doc, sv).
 */
import { randomUUID } from 'crypto'
import type { Database } from 'better-sqlite3'
import type { SyncEnvelope } from '../../shared/network/types'
import {
  decodeStateVectorBase64,
  decodeTaskCrdtUpdate,
  encodeStateVectorBase64,
  isTaskCrdtSyncBatchPayload,
  isTaskCrdtSyncRequestPayload,
  taskCrdtDocId,
  taskCrdtDocIdMatchesGroup,
  type TaskCrdtSyncBatchPayload,
  type TaskCrdtSyncRequestPayload
} from '../../shared/task/taskCrdt'
import {
  applyEncodedUpdate,
  encodeDocStateAsUpdate,
  encodeDocStateVector
} from '../../shared/task/taskCrdtModel'
import { isAnonymousGroupType } from '../../shared/group/guards'
import { listUserGroups, resolveGroupType } from '../group/groupService'
import { getSetupStatus } from '../identity/setup'
import { getNetworkTransport } from '../network'
import { catchSyncFailure } from '../utils/reportSyncFailure'
import {
  ensureTaskCrdtWired,
  mirrorCrdtDocIntoSqlite,
  TASK_CRDT_REMOTE_ORIGIN
} from './taskCrdtService'
import { loadOrCreateGroupTaskDoc, persistGroupTaskDoc } from './taskCrdtStore'

function groupAllowsTaskCrdt(groupId: string, type: ReturnType<typeof resolveGroupType>): boolean {
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

  const payload: TaskCrdtSyncRequestPayload = {
    docId: taskCrdtDocId(groupId),
    stateVectorBase64
  }
  const envelope: SyncEnvelope = {
    version: 1,
    type: 'task_crdt_sync_request',
    msgId: `tc_sync_req_${groupId}_${Date.now()}`,
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

/** On reconnect / init: ask peers for missing Y.Doc updates. */
export async function requestTaskCrdtOfflineSync(db: Database): Promise<void> {
  const transport = getNetworkTransport()
  const status = getSetupStatus(db)
  if (!transport || !status.configured || !status.user || !status.device) return

  for (const group of listUserGroups(db)) {
    const type = resolveGroupType(db, group.groupId)
    if (!groupAllowsTaskCrdt(group.groupId, type)) continue
    ensureTaskCrdtWired(db, group.groupId)
    const doc = loadOrCreateGroupTaskDoc(db, group.groupId)
    const sv = encodeDocStateVector(doc)
    await publishCrdtSyncRequest(db, group.groupId, encodeStateVectorBase64(sv))
  }
}

export async function handleTaskCrdtSyncRequest(
  db: Database,
  envelope: SyncEnvelope
): Promise<void> {
  if (envelope.type !== 'task_crdt_sync_request' || !envelope.groupId) return
  const status = getSetupStatus(db)
  if (!status.configured || !status.user || !status.device) return
  if (envelope.senderDeviceId === status.device.deviceId) return
  if (!groupAllowsTaskCrdt(envelope.groupId, resolveGroupType(db, envelope.groupId))) return
  if (!isTaskCrdtSyncRequestPayload(envelope.payload)) return
  if (!taskCrdtDocIdMatchesGroup(envelope.payload.docId, envelope.groupId)) return

  const transport = getNetworkTransport()
  if (!transport) return

  ensureTaskCrdtWired(db, envelope.groupId)
  const doc = loadOrCreateGroupTaskDoc(db, envelope.groupId)
  const remoteSv = decodeStateVectorBase64(envelope.payload.stateVectorBase64)
  const update = encodeDocStateAsUpdate(doc, remoteSv)
  // Yjs may return a tiny non-empty update even when logically synced; skip only true empty
  if (update.byteLength === 0) return

  const batch: TaskCrdtSyncBatchPayload = {
    docId: taskCrdtDocId(envelope.groupId),
    updateBase64: Buffer.from(update).toString('base64')
  }
  const response: SyncEnvelope = {
    version: 1,
    type: 'task_crdt_sync_batch',
    msgId: `tc_sync_batch_${envelope.groupId}_${randomUUID()}`,
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

type TasksChangedFn = (groupId: string) => void

let onTasksChanged: TasksChangedFn | null = null

export function setTaskCrdtOfflineTasksChangedHandler(handler: TasksChangedFn | null): void {
  onTasksChanged = handler
}

export function handleTaskCrdtSyncBatch(db: Database, envelope: SyncEnvelope): void {
  if (envelope.type !== 'task_crdt_sync_batch' || !envelope.groupId) return
  const status = getSetupStatus(db)
  if (!status.configured || !status.device) return
  if (envelope.senderDeviceId === status.device.deviceId) return
  if (!groupAllowsTaskCrdt(envelope.groupId, resolveGroupType(db, envelope.groupId))) return
  if (!isTaskCrdtSyncBatchPayload(envelope.payload)) return
  if (!taskCrdtDocIdMatchesGroup(envelope.payload.docId, envelope.groupId)) return

  ensureTaskCrdtWired(db, envelope.groupId)
  const doc = loadOrCreateGroupTaskDoc(db, envelope.groupId)
  applyEncodedUpdate(doc, decodeTaskCrdtUpdate(envelope.payload), TASK_CRDT_REMOTE_ORIGIN)
  persistGroupTaskDoc(db, envelope.groupId, doc)
  const sqliteChanged = mirrorCrdtDocIntoSqlite(db, doc, envelope.senderDeviceId)
  if (sqliteChanged) onTasksChanged?.(envelope.groupId)
}

export function wireTaskCrdtOfflineSync(db: Database, onChanged: TasksChangedFn): void {
  setTaskCrdtOfflineTasksChangedHandler(onChanged)
  void requestTaskCrdtOfflineSync(db).catch(
    catchSyncFailure('taskCrdt.requestOffline', { notify: false })
  )
}
