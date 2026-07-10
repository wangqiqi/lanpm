import type { Database } from 'better-sqlite3'
import { randomUUID } from 'crypto'
import { offlineSyncCutoffIso } from '../../shared/chat/offlineSync'
import { SYNC_WINDOW_DAYS } from '../../shared/data/retention'
import { isAnonymousGroupType } from '../../shared/group/guards'
import type { SyncEnvelope } from '../../shared/network/types'
import {
  TASK_OFFLINE_SYNC_BATCH_LIMIT,
  isTaskSyncBatchPayload,
  isTaskSyncRequestPayload,
  maxIsoTimestamp,
  maxUpdatedAtInDepPatches,
  maxUpdatedAtInTasks,
  splitTaskOfflineSyncPage,
  type TaskSyncBatchPayload,
  type TaskSyncRequestPayload
} from '../../shared/task/offlineSync'
import { listUserGroups, resolveGroupType } from '../group/groupService'
import { getSetupStatus } from '../identity/setup'
import { getNetworkTransport } from '../network'
import { catchSyncFailure } from '../utils/reportSyncFailure'
import {
  applyRemoteDepPatch,
  getMaxDepUpdatedAt,
  listDependenciesSince
} from '../storage/repositories/taskDependencyRepository'
import {
  applyRemoteTaskDelete,
  getMaxTaskUpdatedAt,
  listTasksSince,
  upsertTaskFromRemote
} from '../storage/repositories/taskRepository'
import type { Task } from '../../shared/task/types'

/** Safety cap: max pages per sync request (100 × 50). */
const TASK_OFFLINE_SYNC_MAX_PAGES = 50

function groupAllowsTaskSync(groupId: string, type: ReturnType<typeof resolveGroupType>): boolean {
  if (groupId.startsWith('dm:')) return false
  if (isAnonymousGroupType(type) || type === 'function') return false
  return true
}

function getGroupSyncCursor(db: Database, groupId: string): string {
  return maxIsoTimestamp(getMaxTaskUpdatedAt(db, groupId), getMaxDepUpdatedAt(db, groupId))
}

async function publishTaskSyncRequest(
  db: Database,
  groupId: string,
  sinceUpdatedAt: string,
  minUpdatedAt: string
): Promise<void> {
  const transport = getNetworkTransport()
  const status = getSetupStatus(db)
  if (!transport || !status.configured || !status.user || !status.device) return

  const envelope: SyncEnvelope = {
    version: 1,
    type: 'task_sync_request',
    msgId: `task_sync_req_${groupId}_${Date.now()}_${sinceUpdatedAt || '0'}`,
    senderUserId: status.user.userId,
    senderDeviceId: status.device.deviceId,
    groupId,
    ts: new Date().toISOString(),
    payload: { sinceUpdatedAt, minUpdatedAt } satisfies TaskSyncRequestPayload,
    nonce: '',
    authTag: ''
  }
  await transport.publish(envelope)
}

export async function requestTaskOfflineSync(db: Database): Promise<void> {
  const transport = getNetworkTransport()
  const status = getSetupStatus(db)
  if (!transport || !status.configured || !status.user || !status.device) return

  const minUpdatedAt = offlineSyncCutoffIso(SYNC_WINDOW_DAYS)

  for (const group of listUserGroups(db)) {
    const type = resolveGroupType(db, group.groupId)
    if (!groupAllowsTaskSync(group.groupId, type)) continue
    const sinceUpdatedAt = getGroupSyncCursor(db, group.groupId)
    await publishTaskSyncRequest(db, group.groupId, sinceUpdatedAt, minUpdatedAt)
  }
}

export async function handleTaskSyncRequest(db: Database, envelope: SyncEnvelope): Promise<void> {
  if (envelope.type !== 'task_sync_request' || !envelope.groupId) return
  const status = getSetupStatus(db)
  if (!status.configured || !status.user || !status.device) return
  if (envelope.senderDeviceId === status.device.deviceId) return
  if (!groupAllowsTaskSync(envelope.groupId, resolveGroupType(db, envelope.groupId))) return
  if (!isTaskSyncRequestPayload(envelope.payload)) return

  const transport = getNetworkTransport()
  if (!transport) return

  let sinceUpdatedAt = envelope.payload.sinceUpdatedAt ?? ''
  const minUpdatedAt = envelope.payload.minUpdatedAt

  for (let page = 0; page < TASK_OFFLINE_SYNC_MAX_PAGES; page++) {
    const rawTasks = listTasksSince(
      db,
      envelope.groupId,
      sinceUpdatedAt,
      minUpdatedAt,
      TASK_OFFLINE_SYNC_BATCH_LIMIT + 1
    )
    const rawDeps = listDependenciesSince(
      db,
      envelope.groupId,
      sinceUpdatedAt,
      minUpdatedAt,
      TASK_OFFLINE_SYNC_BATCH_LIMIT + 1
    )

    type Merged =
      | { kind: 'task'; updatedAt: string; task: (typeof rawTasks)[number] }
      | { kind: 'dep'; updatedAt: string; dep: (typeof rawDeps)[number] }

    const merged: Merged[] = [
      ...rawTasks.map((task) => ({ kind: 'task' as const, updatedAt: task.updatedAt, task })),
      ...rawDeps.map((dep) => ({ kind: 'dep' as const, updatedAt: dep.updatedAt, dep }))
    ].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))

    const { items: pageItems, hasMore } = splitTaskOfflineSyncPage(
      merged,
      TASK_OFFLINE_SYNC_BATCH_LIMIT
    )
    const tasks = pageItems.filter((i) => i.kind === 'task').map((i) => i.task)
    const dependencies = pageItems.filter((i) => i.kind === 'dep').map((i) => i.dep)

    if (tasks.length > 0 || dependencies.length > 0) {
      const batchPayload: TaskSyncBatchPayload = { tasks, dependencies, hasMore }
      const response: SyncEnvelope = {
        version: 1,
        type: 'task_sync_batch',
        msgId: `task_sync_batch_${envelope.groupId}_${randomUUID()}`,
        senderUserId: status.user.userId,
        senderDeviceId: status.device.deviceId,
        groupId: envelope.groupId,
        ts: new Date().toISOString(),
        payload: batchPayload,
        nonce: '',
        authTag: ''
      }
      await transport.publish(response)
    }

    if (!hasMore || pageItems.length === 0) break
    sinceUpdatedAt = pageItems[pageItems.length - 1]!.updatedAt
  }
}

function applyIncomingTask(
  db: Database,
  task: Task,
  groupId: string,
  remoteDeviceId: string
): boolean {
  const normalized: Task = { ...task, groupId }
  if (normalized.deletedAt) {
    return applyRemoteTaskDelete(db, normalized, remoteDeviceId)
  }
  return upsertTaskFromRemote(db, normalized, remoteDeviceId)
}

export function handleTaskSyncBatch(
  db: Database,
  envelope: SyncEnvelope,
  onChanged?: (groupId: string) => void
): void {
  if (envelope.type !== 'task_sync_batch' || !envelope.groupId) return
  const status = getSetupStatus(db)
  if (!status.configured || !status.device) return
  if (envelope.senderDeviceId === status.device.deviceId) return
  if (!groupAllowsTaskSync(envelope.groupId, resolveGroupType(db, envelope.groupId))) return
  if (!isTaskSyncBatchPayload(envelope.payload)) return

  const cutoff = offlineSyncCutoffIso(SYNC_WINDOW_DAYS)
  let changed = false

  for (const task of envelope.payload.tasks) {
    if (!task?.taskId || task.updatedAt < cutoff) continue
    if (applyIncomingTask(db, task, envelope.groupId, envelope.senderDeviceId)) changed = true
  }

  for (const dep of envelope.payload.dependencies) {
    if (!dep?.dependency?.fromTaskId || dep.updatedAt < cutoff) continue
    if (
      applyRemoteDepPatch(
        db,
        {
          ...dep,
          groupId: envelope.groupId
        },
        envelope.senderDeviceId
      )
    ) {
      changed = true
    }
  }

  if (changed) onChanged?.(envelope.groupId)

  if (
    envelope.payload.hasMore &&
    (envelope.payload.tasks.length > 0 || envelope.payload.dependencies.length > 0)
  ) {
    const nextSince = maxIsoTimestamp(
      maxUpdatedAtInTasks(envelope.payload.tasks),
      maxUpdatedAtInDepPatches(envelope.payload.dependencies)
    )
    void publishTaskSyncRequest(db, envelope.groupId, nextSince, cutoff).catch(
      catchSyncFailure('taskOffline.publishNextPage', { notify: false })
    )
  }
}
