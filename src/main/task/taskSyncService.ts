import type { Database } from 'better-sqlite3'
import { BrowserWindow } from 'electron'
import type { TaskPatchPayload } from '../../shared/task/sync'
import type { SyncEnvelope } from '../../shared/network/types'
import { TASK_PUSH_CHANNEL } from '../../shared/task/channels'
import type { Task } from '../../shared/task/types'
import { isAnonymousGroupType } from '../../shared/group/guards'
import { listUserGroups, resolveGroupType } from '../group/groupService'
import { getSetupStatus } from '../identity/setup'
import { getNetworkTransport } from '../network'
import {
  applyRemoteTaskDelete,
  upsertTaskFromRemote
} from '../storage/repositories/taskRepository'

const subscribedGroups = new Map<string, () => void>()

function broadcastTasksChanged(groupId: string): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(TASK_PUSH_CHANNEL, groupId)
  }
}

function handleTaskPatch(db: Database, envelope: SyncEnvelope): void {
  if (envelope.type !== 'task_patch' || !envelope.groupId) return
  const status = getSetupStatus(db)
  if (!status.configured || !status.device) return
  if (envelope.senderDeviceId === status.device.deviceId) return
  if (isAnonymousGroupType(resolveGroupType(db, envelope.groupId))) return

  const payload = envelope.payload as TaskPatchPayload
  if (!payload?.task?.taskId) return

  const task: Task = { ...payload.task, groupId: envelope.groupId }
  let changed = false
  if (payload.action === 'delete') {
    changed = applyRemoteTaskDelete(db, task)
  } else {
    changed = upsertTaskFromRemote(db, task)
  }
  if (changed) broadcastTasksChanged(envelope.groupId)
}

function ensureSubscribed(db: Database, groupId: string): void {
  if (subscribedGroups.has(groupId)) return
  const transport = getNetworkTransport()
  if (!transport) return
  const unsub = transport.subscribe(groupId, (env) => handleTaskPatch(db, env))
  subscribedGroups.set(groupId, unsub)
}

function refreshSubscriptions(db: Database): void {
  const transport = getNetworkTransport()
  if (!transport) return
  for (const unsub of subscribedGroups.values()) unsub()
  subscribedGroups.clear()
  for (const group of listUserGroups(db)) {
    ensureSubscribed(db, group.groupId)
  }
}

async function publishPatch(db: Database, payload: TaskPatchPayload, groupId: string): Promise<void> {
  const transport = getNetworkTransport()
  const status = getSetupStatus(db)
  if (!transport || !status.configured || !status.user || !status.device) return
  ensureSubscribed(db, groupId)

  const envelope: SyncEnvelope = {
    version: 1,
    type: 'task_patch',
    msgId: `tp_${payload.task.taskId}_${Date.now()}`,
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

export function initTaskSyncService(db: Database): void {
  refreshSubscriptions(db)
}

export function shutdownTaskSyncService(): void {
  for (const unsub of subscribedGroups.values()) unsub()
  subscribedGroups.clear()
}

export function publishTaskUpsert(db: Database, task: Task): void {
  void publishPatch(db, { action: 'upsert', task }, task.groupId).catch(() => undefined)
}

export function publishTaskDelete(db: Database, task: Task): void {
  const now = new Date().toISOString()
  void publishPatch(
    db,
    { action: 'delete', task: { ...task, deletedAt: now, updatedAt: now } },
    task.groupId
  ).catch(() => undefined)
}

export { handleTaskPatch as handleTaskPatchForTest }
