/**
 * group_tag_patch publish / apply (TASK-191).
 */
import { randomUUID } from 'crypto'
import type { Database } from 'better-sqlite3'
import type { SyncEnvelope } from '../../shared/network/types'
import type { GroupTagMeta, GroupTagPatchPayload } from '../../shared/task/groupTagMeta'
import {
  isGroupTagColor,
  isGroupTagPatchPayload,
  normalizeGroupTagKey
} from '../../shared/task/groupTagMeta'
import { isAnonymousGroupType } from '../../shared/group/guards'
import { resolveGroupType } from '../group/groupService'
import { getSetupStatus } from '../identity/setup'
import { getNetworkTransport } from '../network'
import {
  applyRemoteGroupTagDelete,
  applyRemoteGroupTagUpsert,
  deleteGroupTagMeta,
  listGroupTagMeta,
  upsertGroupTagMeta
} from '../storage/repositories/groupTagMetaRepository'
import { catchSyncFailure } from '../utils/reportSyncFailure'
import { enqueueFailedPublish } from '../sync/outboxEnqueue'

type ChangedFn = (groupId: string) => void
let onChanged: ChangedFn | null = null

export function setGroupTagMetaChangedHandler(handler: ChangedFn | null): void {
  onChanged = handler
}

async function publishPatch(db: Database, payload: GroupTagPatchPayload): Promise<void> {
  const status = getSetupStatus(db)
  if (!status.configured || !status.user || !status.device) return
  if (isAnonymousGroupType(resolveGroupType(db, payload.groupId))) return

  const envelope: SyncEnvelope = {
    version: 1,
    type: 'group_tag_patch',
    msgId: `gt_${randomUUID()}`,
    senderUserId: status.user.userId,
    senderDeviceId: status.device.deviceId,
    groupId: payload.groupId,
    ts: new Date().toISOString(),
    payload: {
      ...payload,
      tagKey: normalizeGroupTagKey(payload.tagKey)
    },
    nonce: '',
    authTag: ''
  }
  const dedupeKey = `group_tag:${payload.groupId}:${normalizeGroupTagKey(payload.tagKey)}:${payload.action}`
  const transport = getNetworkTransport()
  if (!transport) {
    enqueueFailedPublish(db, {
      channel: 'group_tag_patch',
      groupId: payload.groupId,
      dedupeKey,
      envelope
    })
    return
  }
  try {
    await transport.publish(envelope)
  } catch (err) {
    enqueueFailedPublish(db, {
      channel: 'group_tag_patch',
      groupId: payload.groupId,
      dedupeKey,
      envelope
    })
    throw err
  }
}

export function handleIncomingGroupTagPatch(db: Database, envelope: SyncEnvelope): void {
  if (envelope.type !== 'group_tag_patch' || !envelope.groupId) return
  const status = getSetupStatus(db)
  if (!status.configured || !status.device) return
  if (envelope.senderDeviceId === status.device.deviceId) return
  if (isAnonymousGroupType(resolveGroupType(db, envelope.groupId))) return
  if (!isGroupTagPatchPayload(envelope.payload)) return

  const payload = envelope.payload
  if (payload.groupId !== envelope.groupId) return
  const tagKey = normalizeGroupTagKey(payload.tagKey)

  let changed = false
  if (payload.action === 'delete') {
    changed = applyRemoteGroupTagDelete(db, payload.groupId, tagKey, payload.updatedAt)
  } else if (payload.color && isGroupTagColor(payload.color)) {
    const meta: GroupTagMeta = {
      groupId: payload.groupId,
      tagKey,
      color: payload.color.trim(),
      label: payload.label,
      updatedAt: payload.updatedAt,
      updatedByUserId: payload.updatedByUserId ?? envelope.senderUserId
    }
    changed = applyRemoteGroupTagUpsert(db, meta)
  }
  if (changed) onChanged?.(payload.groupId)
}

export function listGroupTags(db: Database, groupId: string): GroupTagMeta[] {
  return listGroupTagMeta(db, groupId)
}

export function upsertGroupTagLocal(
  db: Database,
  groupId: string,
  tagKey: string,
  color: string,
  label?: string
): GroupTagMeta {
  if (!isGroupTagColor(color)) throw new Error('invalid color')
  const status = getSetupStatus(db)
  const meta: GroupTagMeta = {
    groupId,
    tagKey: normalizeGroupTagKey(tagKey),
    color: color.trim(),
    label,
    updatedAt: new Date().toISOString(),
    updatedByUserId: status.user?.userId
  }
  const saved = upsertGroupTagMeta(db, meta)
  void publishPatch(db, {
    action: 'upsert',
    groupId: saved.groupId,
    tagKey: saved.tagKey,
    color: saved.color,
    label: saved.label,
    updatedAt: saved.updatedAt,
    updatedByUserId: saved.updatedByUserId
  }).catch(catchSyncFailure('groupTag.publishUpsert', { messageKey: 'sync.taskPublishFailed' }))
  onChanged?.(groupId)
  return saved
}

export function removeGroupTagLocal(db: Database, groupId: string, tagKey: string): boolean {
  const key = normalizeGroupTagKey(tagKey)
  const updatedAt = new Date().toISOString()
  const status = getSetupStatus(db)
  const ok = deleteGroupTagMeta(db, groupId, key)
  if (ok) {
    void publishPatch(db, {
      action: 'delete',
      groupId,
      tagKey: key,
      updatedAt,
      updatedByUserId: status.user?.userId
    }).catch(catchSyncFailure('groupTag.publishDelete', { messageKey: 'sync.taskPublishFailed' }))
    onChanged?.(groupId)
  }
  return ok
}

/** Import localStorage-style map once when SQLite dict is empty. */
export function importLocalTagColorsIfEmpty(
  db: Database,
  groupId: string,
  overrides: Record<string, string>
): number {
  if (listGroupTagMeta(db, groupId).length > 0) return 0
  let n = 0
  const status = getSetupStatus(db)
  const now = new Date().toISOString()
  const imported: GroupTagMeta[] = []
  for (const [rawKey, color] of Object.entries(overrides)) {
    if (!isGroupTagColor(color)) continue
    const tagKey = normalizeGroupTagKey(rawKey)
    if (!tagKey) continue
    const saved = upsertGroupTagMeta(db, {
      groupId,
      tagKey,
      color: color.trim(),
      updatedAt: now,
      updatedByUserId: status.user?.userId
    })
    imported.push(saved)
    n++
  }
  if (n > 0) {
    onChanged?.(groupId)
    for (const saved of imported) {
      void publishPatch(db, {
        action: 'upsert',
        groupId: saved.groupId,
        tagKey: saved.tagKey,
        color: saved.color,
        label: saved.label,
        updatedAt: saved.updatedAt,
        updatedByUserId: saved.updatedByUserId
      }).catch(
        catchSyncFailure('groupTag.publishImport', { messageKey: 'sync.taskPublishFailed' })
      )
    }
  }
  return n
}
