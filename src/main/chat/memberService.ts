import type { Database } from 'better-sqlite3'
import type { GroupMemberView } from '../../shared/chat/members'
import type { UserPresence } from '../../shared/network/types'
import { isDmGroupId, parseDmGroupId } from '../../shared/chat/dmSession'
import { isAnonymousGroupType } from '../../shared/group/guards'
import { getSetupStatus } from '../identity/setup'
import { getAggregatedUserPresence } from '../presence/presenceRegistry'
import { getNetworkTransport } from '../network/stub'
import { getGroupById, listGroupMembers as listDbGroupMembers, resolveGroupType } from '../group/groupService'
import { getUserById } from '../storage/repositories/userRepository'

/** 非匿名群占位成员，便于 @提及联调 */
const STUB_MEMBERS: GroupMemberView[] = [
  { userId: 'demo-alice', displayName: 'Alice', mentionKeys: ['alice'] },
  { userId: 'demo-bob', displayName: 'Bob', mentionKeys: ['bob'] }
]

function resolvePresence(userId: string, localUserId?: string): UserPresence {
  if (localUserId && userId === localUserId) return 'online'
  return getAggregatedUserPresence(userId)
}

function withPresence(members: GroupMemberView[], localUserId?: string): GroupMemberView[] {
  return members.map((m) => ({
    ...m,
    presence: resolvePresence(m.userId, localUserId)
  }))
}

async function collectPeerMembers(db: Database): Promise<Map<string, GroupMemberView>> {
  const status = getSetupStatus(db)
  const members = new Map<string, GroupMemberView>()

  if (status.configured && status.user) {
    members.set(status.user.userId, {
      userId: status.user.userId,
      displayName: status.user.displayName,
      mentionKeys: [status.user.baseName, status.user.userId]
    })
  }

  const transport = getNetworkTransport()
  if (transport) {
    const peers = await transport.discoverPeers()
    for (const peer of peers) {
      if (!peer.userId || peer.userId === '__lanpm_probe__') continue
      if (!members.has(peer.userId)) {
        members.set(peer.userId, {
          userId: peer.userId,
          displayName: peer.displayName,
          mentionKeys: [peer.userId]
        })
      }
    }
  }

  return members
}

function anonymousMembers(db: Database, groupId: string): GroupMemberView[] {
  const records = listDbGroupMembers(db, groupId)
  return records.map((m) => ({
    userId: m.userId,
    displayName: m.displayAlias ?? '访客',
    mentionKeys: m.displayAlias ? [m.displayAlias] : []
  }))
}

export async function listGroupMembers(db: Database, groupId: string): Promise<GroupMemberView[]> {
  const status = getSetupStatus(db)
  const localUserId = status.configured && status.user ? status.user.userId : undefined
  const groupType = resolveGroupType(db, groupId)

  if (isDmGroupId(groupId)) {
    const pair = parseDmGroupId(groupId)
    if (!pair) return []
    const members = await collectPeerMembers(db)
    const result: GroupMemberView[] = []
    for (const userId of pair) {
      const found = members.get(userId)
      result.push(
        found ?? { userId, displayName: userId, mentionKeys: [userId] }
      )
    }
    return withPresence(result, localUserId).sort((a, b) =>
      a.displayName.localeCompare(b.displayName)
    )
  }

  if (isAnonymousGroupType(groupType)) {
    getGroupById(db, groupId)
    return withPresence(anonymousMembers(db, groupId), localUserId)
  }

  const members = await collectPeerMembers(db)
  for (const stub of STUB_MEMBERS) {
    if (!members.has(stub.userId)) members.set(stub.userId, stub)
  }

  return withPresence([...members.values()], localUserId).sort((a, b) =>
    a.displayName.localeCompare(b.displayName)
  )
}

export function getMemberDisplayName(db: Database, groupId: string, userId: string): string {
  const groupType = resolveGroupType(db, groupId)
  if (isAnonymousGroupType(groupType)) {
    const alias = listDbGroupMembers(db, groupId).find((m) => m.userId === userId)?.displayAlias
    return alias ?? '访客'
  }
  const user = getUserById(db, userId)
  return user?.displayName ?? userId
}
