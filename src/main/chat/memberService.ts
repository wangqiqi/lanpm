import type { Database } from 'better-sqlite3'
import type { GroupMemberView } from '../../shared/chat/members'
import { isDmGroupId, parseDmGroupId } from '../../shared/chat/dmSession'
import { getSetupStatus } from '../identity/setup'
import { getNetworkTransport } from '../network/stub'

/** M5 前占位成员，便于 @提及联调 */
const STUB_MEMBERS: GroupMemberView[] = [
  { userId: 'demo-alice', displayName: 'Alice', mentionKeys: ['alice'] },
  { userId: 'demo-bob', displayName: 'Bob', mentionKeys: ['bob'] }
]

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
    return result.sort((a, b) => a.displayName.localeCompare(b.displayName))
  }

  return [...members.values()].sort((a, b) => a.displayName.localeCompare(b.displayName))
}
