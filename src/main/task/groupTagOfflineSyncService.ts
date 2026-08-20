import type { Database } from 'better-sqlite3'
import { randomUUID } from 'crypto'
import { offlineSyncCutoffIso } from '../../shared/chat/offlineSync'
import { SYNC_WINDOW_DAYS } from '../../shared/data/retention'
import { isAnonymousGroupType } from '../../shared/group/guards'
import type { SyncEnvelope } from '../../shared/network/types'
import {
  GROUP_TAG_OFFLINE_SYNC_BATCH_LIMIT,
  isGroupTagSyncBatchPayload,
  isGroupTagSyncRequestPayload,
  maxUpdatedAtInGroupTags,
  splitGroupTagOfflineSyncPage,
  type GroupTagSyncBatchPayload,
  type GroupTagSyncRequestPayload
} from '../../shared/task/groupTagMeta'
import { listUserGroups, resolveGroupType } from '../group/groupService'
import { getSetupStatus } from '../identity/setup'
import { getNetworkTransport } from '../network'
import { catchSyncFailure } from '../utils/reportSyncFailure'
import {
  applyRemoteGroupTagUpsert,
  getMaxGroupTagUpdatedAt,
  listGroupTagsSince
} from '../storage/repositories/groupTagMetaRepository'

const GROUP_TAG_OFFLINE_SYNC_MAX_PAGES = 50

function groupAllowsTagSync(groupId: string, type: ReturnType<typeof resolveGroupType>): boolean {
  if (groupId.startsWith('dm:')) return false
  if (isAnonymousGroupType(type) || type === 'function') return false
  return true
}

async function publishGroupTagSyncRequest(
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
    type: 'group_tag_sync_request',
    msgId: `gt_sync_req_${groupId}_${Date.now()}_${sinceUpdatedAt || '0'}`,
    senderUserId: status.user.userId,
    senderDeviceId: status.device.deviceId,
    groupId,
    ts: new Date().toISOString(),
    payload: { sinceUpdatedAt, minUpdatedAt } satisfies GroupTagSyncRequestPayload,
    nonce: '',
    authTag: ''
  }
  await transport.publish(envelope)
}

export async function requestGroupTagOfflineSync(db: Database): Promise<void> {
  const transport = getNetworkTransport()
  const status = getSetupStatus(db)
  if (!transport || !status.configured || !status.user || !status.device) return

  const minUpdatedAt = offlineSyncCutoffIso(SYNC_WINDOW_DAYS)
  for (const group of listUserGroups(db)) {
    if (!groupAllowsTagSync(group.groupId, resolveGroupType(db, group.groupId))) continue
    const sinceUpdatedAt = getMaxGroupTagUpdatedAt(db, group.groupId)
    await publishGroupTagSyncRequest(db, group.groupId, sinceUpdatedAt, minUpdatedAt)
  }
}

export async function handleGroupTagSyncRequest(
  db: Database,
  envelope: SyncEnvelope
): Promise<void> {
  if (envelope.type !== 'group_tag_sync_request' || !envelope.groupId) return
  const status = getSetupStatus(db)
  if (!status.configured || !status.user || !status.device) return
  if (envelope.senderDeviceId === status.device.deviceId) return
  if (!groupAllowsTagSync(envelope.groupId, resolveGroupType(db, envelope.groupId))) return
  if (!isGroupTagSyncRequestPayload(envelope.payload)) return

  const transport = getNetworkTransport()
  if (!transport) return

  let sinceUpdatedAt = envelope.payload.sinceUpdatedAt ?? ''
  const minUpdatedAt = envelope.payload.minUpdatedAt

  for (let page = 0; page < GROUP_TAG_OFFLINE_SYNC_MAX_PAGES; page++) {
    const raw = listGroupTagsSince(
      db,
      envelope.groupId,
      sinceUpdatedAt,
      minUpdatedAt,
      GROUP_TAG_OFFLINE_SYNC_BATCH_LIMIT + 1
    )
    const { tags, hasMore } = splitGroupTagOfflineSyncPage(raw, GROUP_TAG_OFFLINE_SYNC_BATCH_LIMIT)

    if (tags.length > 0) {
      const batchPayload: GroupTagSyncBatchPayload = { tags, hasMore }
      const response: SyncEnvelope = {
        version: 1,
        type: 'group_tag_sync_batch',
        msgId: `gt_sync_batch_${envelope.groupId}_${randomUUID()}`,
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

    if (!hasMore || tags.length === 0) break
    sinceUpdatedAt = maxUpdatedAtInGroupTags(tags)
  }
}

export function handleGroupTagSyncBatch(
  db: Database,
  envelope: SyncEnvelope,
  onChanged?: (groupId: string) => void
): void {
  if (envelope.type !== 'group_tag_sync_batch' || !envelope.groupId) return
  const status = getSetupStatus(db)
  if (!status.configured || !status.device) return
  if (envelope.senderDeviceId === status.device.deviceId) return
  if (!groupAllowsTagSync(envelope.groupId, resolveGroupType(db, envelope.groupId))) return
  if (!isGroupTagSyncBatchPayload(envelope.payload)) return

  const cutoff = offlineSyncCutoffIso(SYNC_WINDOW_DAYS)
  let changed = false
  for (const tag of envelope.payload.tags) {
    if (tag.updatedAt < cutoff) continue
    const meta = { ...tag, groupId: envelope.groupId }
    if (applyRemoteGroupTagUpsert(db, meta)) changed = true
  }
  if (changed) onChanged?.(envelope.groupId)

  if (envelope.payload.hasMore && envelope.payload.tags.length > 0) {
    const nextSince = maxUpdatedAtInGroupTags(envelope.payload.tags)
    void publishGroupTagSyncRequest(db, envelope.groupId, nextSince, cutoff).catch(
      catchSyncFailure('groupTagOffline.publishNextPage', { notify: false })
    )
  }
}
