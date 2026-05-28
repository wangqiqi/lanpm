import type { Database } from 'better-sqlite3'
import type { GroupMemberView } from '../../shared/chat/members'
import { getSetupStatus } from '../identity/setup'
import { getNetworkTransport } from '../network/stub'

/** M5 前占位成员，便于 @提及联调 */
const STUB_MEMBERS: GroupMemberView[] = [
  { userId: 'demo-alice', displayName: 'Alice', mentionKeys: ['alice'] },
  { userId: 'demo-bob', displayName: 'Bob', mentionKeys: ['bob'] }
]

export async function listGroupMembers(_db: Database, groupId: string): Promise<GroupMemberView[]> {
  void groupId // M5 前成员与群组无关，占位参数保留 API
  const status = getSetupStatus(_db)
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

  return [...members.values()].sort((a, b) => a.displayName.localeCompare(b.displayName))
}
