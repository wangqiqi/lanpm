import type { Database } from 'better-sqlite3'
import type { GroupKeyRotatePayload } from '../../shared/network/groupKey'
import type { SyncEnvelope } from '../../shared/network/types'
import { listUserGroups } from '../group/groupService'
import { getSetupStatus } from '../identity/setup'
import { getNetworkTransport } from '../network'
import { getMeta, setMeta } from '../storage/repositories/syncMetaRepository'

const ROTATE_INTERVAL_MS = 24 * 60 * 60 * 1000
const CHECK_INTERVAL_MS = 60 * 60 * 1000

function versionKey(groupId: string): string {
  return `group_key_version:${groupId}`
}

function rotatedAtKey(groupId: string): string {
  return `group_key_rotated_at:${groupId}`
}

let checkTimer: ReturnType<typeof setInterval> | null = null

export function getGroupKeyVersion(db: Database, groupId: string): number {
  const raw = getMeta(db, versionKey(groupId))
  const n = raw ? Number(raw) : 1
  return Number.isFinite(n) && n >= 1 ? n : 1
}

export function handleGroupKeyRotate(db: Database, envelope: SyncEnvelope): void {
  if (envelope.type !== 'group_key_rotate' || !envelope.groupId) return
  const payload = envelope.payload as GroupKeyRotatePayload
  if (!payload?.keyVersion || payload.groupId !== envelope.groupId) return

  const local = getGroupKeyVersion(db, envelope.groupId)
  if (payload.keyVersion <= local) return

  setMeta(db, versionKey(envelope.groupId), String(payload.keyVersion))
  if (payload.rotatedAt) {
    setMeta(db, rotatedAtKey(envelope.groupId), payload.rotatedAt)
  }
}

async function publishGroupKeyRotate(
  db: Database,
  groupId: string,
  keyVersion: number,
  rotatedAt: string
): Promise<void> {
  const transport = getNetworkTransport()
  const status = getSetupStatus(db)
  if (!transport || !status.configured || !status.user || !status.device) return

  const envelope: SyncEnvelope = {
    version: 1,
    type: 'group_key_rotate',
    msgId: `gkr_${groupId}_${keyVersion}_${Date.now()}`,
    senderUserId: status.user.userId,
    senderDeviceId: status.device.deviceId,
    groupId,
    ts: rotatedAt,
    keyVersion,
    payload: { groupId, keyVersion, rotatedAt } satisfies GroupKeyRotatePayload,
    nonce: '',
    authTag: ''
  }
  await transport.publish(envelope)
}

async function maybeRotateGroup(db: Database, groupId: string): Promise<void> {
  const last = getMeta(db, rotatedAtKey(groupId))
  if (last) {
    const elapsed = Date.now() - new Date(last).getTime()
    if (elapsed < ROTATE_INTERVAL_MS) return
  }

  const nextVersion = getGroupKeyVersion(db, groupId) + 1
  const rotatedAt = new Date().toISOString()
  setMeta(db, versionKey(groupId), String(nextVersion))
  setMeta(db, rotatedAtKey(groupId), rotatedAt)
  await publishGroupKeyRotate(db, groupId, nextVersion, rotatedAt)
}

function runRotationCheck(db: Database): void {
  for (const group of listUserGroups(db)) {
    void maybeRotateGroup(db, group.groupId).catch(() => undefined)
  }
}

export function initGroupKeyService(db: Database): void {
  if (checkTimer) clearInterval(checkTimer)
  runRotationCheck(db)
  checkTimer = setInterval(() => runRotationCheck(db), CHECK_INTERVAL_MS)
}

export function shutdownGroupKeyService(): void {
  if (checkTimer) clearInterval(checkTimer)
  checkTimer = null
}
