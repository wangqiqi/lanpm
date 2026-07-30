import type { Database } from 'better-sqlite3'
import type { GroupInviteSessionView } from '../../shared/group/groupInvite'
import type { JoinGroupResult } from '../../shared/group/joinRequest'
import { throwLanpm } from '../../shared/errors/lanpmError'
import { DEFAULT_TCP_LISTEN_PORT } from '../../shared/network/constants.ts'
import { parseHostPort } from '../../shared/network/manualPeer'
import { rememberPeerGroups } from '../discover/discoverGroupRegistry'
import { getNetworkTransport, RealNetworkTransport } from '../network'
import { getSetupStatus } from '../identity/setup'
import { applyApprovedDiscoverableJoin, getGroupById } from './groupService'
import { getGroupById as getGroupRow, listGroupMembers } from '../storage/repositories/groupRepository'
import { initChatService } from '../chat/chatService'

export interface GroupInviteJoinInput {
  code: string
  unicastHost?: string
  port?: number
}

function requireRealTransport(): RealNetworkTransport {
  const transport = getNetworkTransport()
  if (!(transport instanceof RealNetworkTransport)) {
    throwLanpm('err.manualPeerUnsupported')
  }
  return transport
}

function isGroupOwner(db: Database, groupId: string, userId: string): boolean {
  const group = getGroupRow(db, groupId)
  if (!group) return false
  if (group.createdBy === userId) return true
  return listGroupMembers(db, groupId).some((m) => m.userId === userId && m.role === 'owner')
}

function resolveJoinTarget(input: GroupInviteJoinInput): { unicastHost?: string; port?: number } {
  if (!input.unicastHost?.trim()) {
    return {}
  }
  const trimmed = input.unicastHost.trim()
  if (trimmed.includes(':')) {
    const { host, port } = parseHostPort(trimmed)
    return { unicastHost: host, port }
  }
  return {
    unicastHost: trimmed,
    port: input.port ?? DEFAULT_TCP_LISTEN_PORT
  }
}

export function startGroupInvite(db: Database, groupId: string): GroupInviteSessionView {
  const status = getSetupStatus(db)
  if (!status.configured || !status.user) {
    throwLanpm('stub.identityRequired')
  }

  const group = getGroupRow(db, groupId)
  if (!group) {
    throwLanpm('err.groupNotFound')
  }
  if (!isGroupOwner(db, groupId, status.user.userId)) {
    throw new Error('group_invite_not_owner')
  }

  return requireRealTransport().startGroupInviteSession(group.groupId, group.name, group.type)
}

export function cancelGroupInvite(groupId: string): void {
  const transport = getNetworkTransport()
  if (transport instanceof RealNetworkTransport) {
    transport.cancelGroupInviteSession(groupId)
  }
}

export async function joinWithGroupInviteCode(
  db: Database,
  input: GroupInviteJoinInput
): Promise<JoinGroupResult> {
  const status = getSetupStatus(db)
  if (!status.configured || !status.user) {
    throwLanpm('stub.identityRequired')
  }

  const code = input.code?.trim()
  if (!code) {
    throw new Error('group_invite_code_required')
  }

  const localUserId = status.user.userId
  const target = resolveJoinTarget(input)
  const found = await requireRealTransport().joinWithGroupInviteCode(code, target)

  const members = listGroupMembers(db, found.groupId)
  if (members.some((m) => m.userId === localUserId)) {
    const group = getGroupById(db, found.groupId)
    if (!group) throwLanpm('err.groupNotFound')
    return { status: 'already_member', group }
  }

  rememberPeerGroups(found.ownerUserId, found.ownerDisplayName, [
    { groupId: found.groupId, name: found.groupName, type: found.groupType }
  ])

  const group = applyApprovedDiscoverableJoin(db, found.groupId, localUserId)
  initChatService(db)
  return { status: 'joined', group }
}
