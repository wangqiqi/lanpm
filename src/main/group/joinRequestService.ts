import { randomUUID } from 'crypto'
import type { Database } from 'better-sqlite3'
import { BrowserWindow } from 'electron'
import type {
  JoinGroupResult,
  JoinRequestDecisionPayload,
  JoinRequestPayload,
  JoinRequestRecord
} from '../../shared/group/joinRequest'
import {
  isJoinRequestDecisionPayload,
  isJoinRequestPayload
} from '../../shared/group/joinRequest'
import { GROUP_JOIN_REQUEST_PUSH_CHANNEL } from '../../shared/group/channels'
import type { SyncEnvelope } from '../../shared/network/types'
import { USER_NOTICE_CHANNEL, type UserNotice } from '../../shared/sync/userNotice'
import { getSetupStatus } from '../identity/setup'
import type { NetworkTransport } from '../../shared/network'
import { getNetworkTransport } from '../network'
import { broadcastToAllWindows } from '../utils/broadcast'
import { catchSyncFailure } from '../utils/reportSyncFailure'
import { getCachedGroup } from '../discover/discoverGroupRegistry'
import { throwLanpm } from '../../shared/errors/lanpmError'
import {
  applyApprovedDiscoverableJoin,
  getGroupDisplayNameForNotice,
  getGroupById
} from './groupService'
import {
  getJoinRequest,
  getPendingJoinRequestId,
  hasPendingJoinRequest,
  insertJoinRequest,
  listPendingJoinRequestsForOwner,
  updateJoinRequestStatus
} from '../storage/repositories/groupJoinRequestRepository'
import { listGroupMembers } from '../storage/repositories/groupRepository'
import { initChatService } from '../chat/chatService'

let joinRequestUnsub: (() => void) | null = null

function broadcastJoinRequestsChanged(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(GROUP_JOIN_REQUEST_PUSH_CHANNEL)
  }
}

function notifyUser(notice: UserNotice): void {
  broadcastToAllWindows(USER_NOTICE_CHANNEL, notice)
}

async function publishJoinRequest(db: Database, payload: JoinRequestPayload): Promise<void> {
  const transport = getNetworkTransport()
  const status = getSetupStatus(db)
  if (!transport || !status.configured || !status.user || !status.device) return

  const envelope: SyncEnvelope = {
    version: 1,
    type: 'join_request',
    msgId: `jr_${payload.requestId}`,
    senderUserId: status.user.userId,
    senderDeviceId: status.device.deviceId,
    ts: payload.at,
    payload,
    nonce: '',
    authTag: ''
  }
  await transport.publish(envelope)
}

async function publishJoinDecision(
  db: Database,
  payload: JoinRequestDecisionPayload
): Promise<void> {
  const transport = getNetworkTransport()
  const status = getSetupStatus(db)
  if (!transport || !status.configured || !status.user || !status.device) return

  const envelope: SyncEnvelope = {
    version: 1,
    type: 'join_request_decision',
    msgId: `jrd_${payload.requestId}_${payload.approved ? 'ok' : 'no'}`,
    senderUserId: status.user.userId,
    senderDeviceId: status.device.deviceId,
    ts: payload.at,
    payload,
    nonce: '',
    authTag: ''
  }
  await transport.publish(envelope)
}

export function listIncomingJoinRequests(db: Database): JoinRequestRecord[] {
  const status = getSetupStatus(db)
  if (!status.configured || !status.user) return []
  return listPendingJoinRequestsForOwner(db, status.user.userId).map((req) => ({
    ...req,
    groupName: getGroupDisplayNameForNotice(db, req.groupId)
  }))
}

export async function approveJoinRequest(db: Database, requestId: string): Promise<void> {
  const status = getSetupStatus(db)
  if (!status.configured || !status.user) {
    throw new Error('identity_required')
  }

  const request = getJoinRequest(db, requestId)
  if (!request || request.status !== 'pending') {
    throw new Error('join_request_not_found')
  }
  if (request.ownerUserId !== status.user.userId) {
    throw new Error('join_request_not_owner')
  }

  const now = new Date().toISOString()
  applyApprovedDiscoverableJoin(db, request.groupId, request.applicantUserId)
  updateJoinRequestStatus(db, requestId, 'approved', status.user.userId, now)
  broadcastJoinRequestsChanged()

  const payload: JoinRequestDecisionPayload = {
    requestId,
    groupId: request.groupId,
    applicantUserId: request.applicantUserId,
    approved: true,
    at: now,
    actorUserId: status.user.userId
  }
  await publishJoinDecision(db, payload).catch(
    catchSyncFailure('group.joinDecisionPublish', { messageKey: 'sync.joinDecisionPublishFailed' })
  )
  initChatService(db)
}

export async function rejectJoinRequest(db: Database, requestId: string): Promise<void> {
  const status = getSetupStatus(db)
  if (!status.configured || !status.user) {
    throw new Error('identity_required')
  }

  const request = getJoinRequest(db, requestId)
  if (!request || request.status !== 'pending') {
    throw new Error('join_request_not_found')
  }
  if (request.ownerUserId !== status.user.userId) {
    throw new Error('join_request_not_owner')
  }

  const now = new Date().toISOString()
  updateJoinRequestStatus(db, requestId, 'rejected', status.user.userId, now)
  broadcastJoinRequestsChanged()

  const payload: JoinRequestDecisionPayload = {
    requestId,
    groupId: request.groupId,
    applicantUserId: request.applicantUserId,
    approved: false,
    at: now,
    actorUserId: status.user.userId
  }
  await publishJoinDecision(db, payload).catch(
    catchSyncFailure('group.joinDecisionPublish', { messageKey: 'sync.joinDecisionPublishFailed' })
  )
}

export async function submitJoinRequest(
  db: Database,
  input: {
    requestId: string
    groupId: string
    groupName: string
    ownerUserId: string
    applicantUserId: string
    applicantDisplayName: string
    createdAt: string
  }
): Promise<void> {
  if (hasPendingJoinRequest(db, input.groupId, input.applicantUserId)) return

  const record: JoinRequestRecord = {
    requestId: input.requestId,
    groupId: input.groupId,
    applicantUserId: input.applicantUserId,
    applicantDisplayName: input.applicantDisplayName,
    ownerUserId: input.ownerUserId,
    status: 'pending',
    createdAt: input.createdAt
  }
  insertJoinRequest(db, record)
  broadcastJoinRequestsChanged()

  const payload: JoinRequestPayload = {
    requestId: input.requestId,
    groupId: input.groupId,
    groupName: input.groupName,
    ownerUserId: input.ownerUserId,
    applicantUserId: input.applicantUserId,
    applicantDisplayName: input.applicantDisplayName,
    at: input.createdAt
  }
  await publishJoinRequest(db, payload).catch(
    catchSyncFailure('group.joinRequestPublish', { messageKey: 'sync.joinRequestPublishFailed' })
  )
}

export function handleIncomingJoinRequest(db: Database, envelope: SyncEnvelope): void {
  if (envelope.type !== 'join_request') return
  const status = getSetupStatus(db)
  if (!status.configured || !status.user || !status.device) return
  if (envelope.senderDeviceId === status.device.deviceId) return
  if (!isJoinRequestPayload(envelope.payload)) return

  const payload = envelope.payload
  if (payload.ownerUserId !== status.user.userId) return
  if (payload.applicantUserId === status.user.userId) return

  if (hasPendingJoinRequest(db, payload.groupId, payload.applicantUserId)) return

  insertJoinRequest(db, {
    requestId: payload.requestId,
    groupId: payload.groupId,
    applicantUserId: payload.applicantUserId,
    applicantDisplayName: payload.applicantDisplayName,
    ownerUserId: payload.ownerUserId,
    status: 'pending',
    createdAt: payload.at
  })
  broadcastJoinRequestsChanged()
  notifyUser({
    level: 'warning',
    messageKey: 'group.joinRequestReceived',
    params: {
      name: payload.applicantDisplayName,
      group: payload.groupName
    }
  })
}

export function handleIncomingJoinDecision(db: Database, envelope: SyncEnvelope): void {
  if (envelope.type !== 'join_request_decision') return
  const status = getSetupStatus(db)
  if (!status.configured || !status.user || !status.device) return
  if (envelope.senderDeviceId === status.device.deviceId) return
  if (!isJoinRequestDecisionPayload(envelope.payload)) return

  const payload = envelope.payload
  if (payload.applicantUserId !== status.user.userId) return

  const existing = getJoinRequest(db, payload.requestId)
  if (existing && existing.status !== 'pending') return

  const now = payload.at
  if (payload.approved) {
    applyApprovedDiscoverableJoin(db, payload.groupId, status.user.userId)
    if (existing) {
      updateJoinRequestStatus(db, payload.requestId, 'approved', payload.actorUserId, now)
    }
    broadcastJoinRequestsChanged()
    notifyUser({
      level: 'warning',
      messageKey: 'group.joinRequestApproved',
      params: { name: getGroupDisplayNameForNotice(db, payload.groupId) }
    })
    initChatService(db)
    return
  }

  if (existing) {
    updateJoinRequestStatus(db, payload.requestId, 'rejected', payload.actorUserId, now)
  }
  broadcastJoinRequestsChanged()
  notifyUser({
    level: 'warning',
    messageKey: 'group.joinRequestRejected',
    params: { name: getGroupDisplayNameForNotice(db, payload.groupId) }
  })
}

export async function requestJoinDiscoverableGroup(
  db: Database,
  groupId: string
): Promise<JoinGroupResult> {
  const status = getSetupStatus(db)
  if (!status.configured || !status.user) {
    throwLanpm('stub.identityRequired')
  }

  const localUserId = status.user.userId
  if (isGroupMember(db, groupId, localUserId)) {
    const group = getGroupById(db, groupId)
    if (!group) throwLanpm('err.groupNotFound')
    return { status: 'already_member', group }
  }

  const cached = getCachedGroup(groupId)
  const existingGroup = getGroupById(db, groupId)
  if (!cached && !existingGroup) {
    throwLanpm('err.groupNotDiscovered')
  }

  const pendingId = getPendingJoinRequestId(db, groupId, localUserId)
  if (pendingId) {
    return { status: 'pending', requestId: pendingId }
  }

  const ownerUserId = existingGroup?.createdBy ?? cached!.ownerUserId
  if (ownerUserId === localUserId) {
    return {
      status: 'already_member',
      group: applyApprovedDiscoverableJoin(db, groupId, localUserId)
    }
  }

  const requestId = `jr_${randomUUID()}`
  const now = new Date().toISOString()
  const groupName = existingGroup?.name ?? cached!.advert.name

  await submitJoinRequest(db, {
    requestId,
    groupId,
    groupName,
    ownerUserId,
    applicantUserId: localUserId,
    applicantDisplayName: status.user.displayName,
    createdAt: now
  })

  return { status: 'pending', requestId }
}

export function initJoinRequestService(db: Database): void {
  joinRequestUnsub?.()
  joinRequestUnsub = null

  const transport = getNetworkTransport()
  if (!transport) return

  const withGlobal = transport as NetworkTransport & {
    subscribeAll?: (handler: (envelope: SyncEnvelope) => void) => () => void
  }
  if (typeof withGlobal.subscribeAll !== 'function') return

  joinRequestUnsub = withGlobal.subscribeAll((env: SyncEnvelope) => {
    handleIncomingJoinRequest(db, env)
    handleIncomingJoinDecision(db, env)
  })
}

export function shutdownJoinRequestService(): void {
  joinRequestUnsub?.()
  joinRequestUnsub = null
}

export function isGroupMember(db: Database, groupId: string, userId: string): boolean {
  return listGroupMembers(db, groupId).some((m) => m.userId === userId)
}
