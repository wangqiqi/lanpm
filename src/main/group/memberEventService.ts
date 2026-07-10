import { randomUUID } from 'crypto'
import type { Database } from 'better-sqlite3'
import { isMemberEventPayload, type MemberEventPayload } from '../../shared/group/memberEvent'
import type { SyncEnvelope } from '../../shared/network/types'
import { USER_NOTICE_CHANNEL, type UserNotice } from '../../shared/sync/userNotice'
import { getSetupStatus } from '../identity/setup'
import { getNetworkTransport } from '../network'
import { broadcastToAllWindows } from '../utils/broadcast'
import {
  applyRemoteGroupDissolved,
  getGroupDisplayNameForNotice
} from './groupService'

export async function publishDissolveMemberEvent(
  db: Database,
  groupId: string
): Promise<void> {
  const transport = getNetworkTransport()
  const status = getSetupStatus(db)
  if (!transport || !status.configured || !status.user || !status.device) return

  const now = new Date().toISOString()
  const payload: MemberEventPayload = {
    action: 'dissolve',
    groupId,
    at: now,
    actorUserId: status.user.userId
  }
  const envelope: SyncEnvelope = {
    version: 1,
    type: 'member_event',
    msgId: `me_${randomUUID()}`,
    senderUserId: status.user.userId,
    senderDeviceId: status.device.deviceId,
    groupId,
    ts: now,
    payload,
    nonce: '',
    authTag: ''
  }
  await transport.publish(envelope)
}

export function handleIncomingMemberEvent(db: Database, envelope: SyncEnvelope): void {
  if (envelope.type !== 'member_event') return
  const status = getSetupStatus(db)
  if (!status.configured || !status.device) return
  if (envelope.senderDeviceId === status.device.deviceId) return
  if (!isMemberEventPayload(envelope.payload)) return

  const payload = envelope.payload
  if (payload.action !== 'dissolve') return

  const groupId = payload.groupId || envelope.groupId
  if (!groupId) return

  const name = getGroupDisplayNameForNotice(db, groupId)
  if (!applyRemoteGroupDissolved(db, groupId)) return

  const notice: UserNotice = {
    level: 'warning',
    messageKey: 'group.dissolvedRemotely',
    params: { name: name || groupId }
  }
  broadcastToAllWindows(USER_NOTICE_CHANNEL, notice)
}
