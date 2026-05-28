import type { Database } from 'better-sqlite3'
import type { GroupMemberView } from '../../shared/chat/members'
import type { UserPresence } from '../../shared/network/types'
import { isDmGroupId, parseDmGroupId } from '../../shared/chat/dmSession'
import { getSetupStatus } from '../identity/setup'
import { getAggregatedUserPresence } from '../presence/presenceRegistry'
import { getNetworkTransport } from '../network/stub'

/** M5 前占位成员，便于 @提及联调 */
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

async function collectAllMembers(db: Database): Promise<Map<string, GroupMemberView>> {
  const status = getSetupStatus(db)
  const members = new Map<string, GroupMemberView>()

  for (const stub of STUB_MEMBERS) {
    members.set(stub.userId, stub)
  }

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

export async function listGroupMembers(db: Database, groupId: string): Promise<GroupMemberView[]> {
  const status = getSetupStatus(db)
  const localUserId = status.configured && status.user ? status.user.userId : undefined
  const members = await collectAllMembers(db)

  if (isDmGroupId(groupId)) {
    const pair = parseDmGroupId(groupId)
    if (!pair) return []
    const [userA, userB] = pair
    const result: GroupMemberView[] = []
    for (const userId of [userA, userB]) {
      const found = members.get(userId)
      if (found) {
        result.push(found)
      } else {
        result.push({ userId, displayName: userId, mentionKeys: [userId] })
      }
    }
    return withPresence(result, localUserId).sort((a, b) =>
      a.displayName.localeCompare(b.displayName)
    )
  }

  return withPresence([...members.values()], localUserId).sort((a, b) =>
    a.displayName.localeCompare(b.displayName)
  )
}
