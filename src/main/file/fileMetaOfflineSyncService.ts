/**
 * File library index offline catch-up (TASK-4803).
 * Bytes still require file_pull; this only upserts remote-pending FileMeta.
 */
import type { Database } from 'better-sqlite3'
import { randomUUID } from 'crypto'
import { offlineSyncCutoffIso } from '../../shared/chat/offlineSync'
import { SYNC_WINDOW_DAYS } from '../../shared/data/retention'
import {
  FILE_META_OFFLINE_SYNC_BATCH_LIMIT,
  isFileMetaSyncBatchPayload,
  isFileMetaSyncRequestPayload,
  maxUpdatedAtInFileMetas,
  REMOTE_PENDING_PREFIX,
  splitFileMetaOfflineSyncPage,
  toFileMetaSyncWire,
  type FileMetaSyncBatchPayload,
  type FileMetaSyncRequestPayload
} from '../../shared/file/sync'
import type { FileMeta } from '../../shared/file/types'
import { isAnonymousGroupType } from '../../shared/group/guards'
import type { SyncEnvelope } from '../../shared/network/types'
import { listUserGroups, resolveGroupType } from '../group/groupService'
import { getSetupStatus } from '../identity/setup'
import { getNetworkTransport } from '../network'
import {
  getMaxFileMetaUpdatedAt,
  listFileMetaSince,
  upsertRemoteFileMeta
} from '../storage/repositories/fileRepository'
import { catchSyncFailure } from '../utils/reportSyncFailure'

export const FILE_META_OFFLINE_SYNC_TYPES = [
  'file_meta_sync_request',
  'file_meta_sync_batch'
] as const

const FILE_META_OFFLINE_SYNC_MAX_PAGES = 50

function groupAllowsFileMetaSync(
  groupId: string,
  type: ReturnType<typeof resolveGroupType>
): boolean {
  if (isAnonymousGroupType(type)) return false
  return Boolean(groupId)
}

async function publishFileMetaSyncRequest(
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
    type: 'file_meta_sync_request',
    msgId: `fm_sync_req_${groupId}_${Date.now()}_${sinceUpdatedAt || '0'}`,
    senderUserId: status.user.userId,
    senderDeviceId: status.device.deviceId,
    groupId,
    ts: new Date().toISOString(),
    payload: { sinceUpdatedAt, minUpdatedAt } satisfies FileMetaSyncRequestPayload,
    nonce: '',
    authTag: ''
  }
  await transport.publish(envelope)
}

export async function requestFileMetaOfflineSync(db: Database): Promise<void> {
  const transport = getNetworkTransport()
  const status = getSetupStatus(db)
  if (!transport || !status.configured || !status.user || !status.device) return

  const minUpdatedAt = offlineSyncCutoffIso(SYNC_WINDOW_DAYS)
  for (const group of listUserGroups(db)) {
    if (!groupAllowsFileMetaSync(group.groupId, resolveGroupType(db, group.groupId))) continue
    const sinceUpdatedAt = getMaxFileMetaUpdatedAt(db, group.groupId)
    await publishFileMetaSyncRequest(db, group.groupId, sinceUpdatedAt, minUpdatedAt)
  }
}

export async function handleFileMetaSyncRequest(
  db: Database,
  envelope: SyncEnvelope
): Promise<void> {
  if (envelope.type !== 'file_meta_sync_request' || !envelope.groupId) return
  const status = getSetupStatus(db)
  if (!status.configured || !status.user || !status.device) return
  if (envelope.senderDeviceId === status.device.deviceId) return
  if (!groupAllowsFileMetaSync(envelope.groupId, resolveGroupType(db, envelope.groupId))) return
  if (!isFileMetaSyncRequestPayload(envelope.payload)) return

  const transport = getNetworkTransport()
  if (!transport) return

  let sinceUpdatedAt = envelope.payload.sinceUpdatedAt ?? ''
  const minUpdatedAt = envelope.payload.minUpdatedAt

  for (let page = 0; page < FILE_META_OFFLINE_SYNC_MAX_PAGES; page++) {
    const raw = listFileMetaSince(
      db,
      envelope.groupId,
      sinceUpdatedAt,
      minUpdatedAt,
      FILE_META_OFFLINE_SYNC_BATCH_LIMIT + 1
    )
    const { files, hasMore } = splitFileMetaOfflineSyncPage(raw, FILE_META_OFFLINE_SYNC_BATCH_LIMIT)
    const wire = files.map(toFileMetaSyncWire)

    if (wire.length > 0) {
      const batchPayload: FileMetaSyncBatchPayload = { files: wire, hasMore }
      const response: SyncEnvelope = {
        version: 1,
        type: 'file_meta_sync_batch',
        msgId: `fm_sync_batch_${envelope.groupId}_${randomUUID()}`,
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

    if (!hasMore || wire.length === 0) break
    sinceUpdatedAt = maxUpdatedAtInFileMetas(files)
  }
}

export function handleFileMetaSyncBatch(
  db: Database,
  envelope: SyncEnvelope,
  onChanged?: (groupId: string) => void
): void {
  if (envelope.type !== 'file_meta_sync_batch' || !envelope.groupId) return
  const status = getSetupStatus(db)
  if (!status.configured || !status.device) return
  if (envelope.senderDeviceId === status.device.deviceId) return
  if (!groupAllowsFileMetaSync(envelope.groupId, resolveGroupType(db, envelope.groupId))) return
  if (!isFileMetaSyncBatchPayload(envelope.payload)) return

  const cutoff = offlineSyncCutoffIso(SYNC_WINDOW_DAYS)
  let changed = false
  for (const remote of envelope.payload.files) {
    if (remote.updatedAt < cutoff) continue
    const meta: FileMeta = {
      ...remote,
      groupId: envelope.groupId,
      storagePath: `${REMOTE_PENDING_PREFIX}${remote.fileId}`,
      previewStatus: 'none',
      previewPath: undefined,
      updatedAt: remote.updatedAt || remote.uploadedAt
    }
    if (upsertRemoteFileMeta(db, meta)) changed = true
  }
  if (changed) onChanged?.(envelope.groupId)

  if (envelope.payload.hasMore && envelope.payload.files.length > 0) {
    const nextSince = maxUpdatedAtInFileMetas(envelope.payload.files)
    void publishFileMetaSyncRequest(db, envelope.groupId, nextSince, cutoff).catch(
      catchSyncFailure('fileMetaOffline.publishNextPage', { notify: false })
    )
  }
}
