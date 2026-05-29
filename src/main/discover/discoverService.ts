import type { Database } from 'better-sqlite3'
import type { DiscoverSnapshot } from '../../shared/discover/types'
import { getSetupStatus } from '../identity/setup'
import { listUserGroups } from '../group/groupService'
import { listGroupMembers } from '../storage/repositories/groupRepository'
import { getNetworkTransport } from '../network'
import { getAggregatedUserPresence } from '../presence/presenceRegistry'
import { listCachedDiscoverGroups } from './discoverGroupRegistry'

export async function fetchDiscoverSnapshot(db: Database): Promise<DiscoverSnapshot> {
  const status = getSetupStatus(db)
  const localUserId = status.configured && status.user ? status.user.userId : undefined

  const transport = getNetworkTransport()
  const discovered = transport ? await transport.discoverPeers() : []

  const peerMap = new Map<string, { displayName: string; devices: Set<string> }>()
  for (const peer of discovered) {
    if (!peer.userId || peer.userId === '__lanpm_probe__') continue
    if (localUserId && peer.userId === localUserId) continue
    const existing = peerMap.get(peer.userId)
    if (existing) {
      existing.devices.add(peer.deviceId)
      if (peer.displayName) existing.displayName = peer.displayName
    } else {
      peerMap.set(peer.userId, {
        displayName: peer.displayName || peer.userId,
        devices: new Set([peer.deviceId])
      })
    }
  }

  const peers = [...peerMap.entries()]
    .map(([userId, info]) => ({
      userId,
      displayName: info.displayName,
      deviceCount: info.devices.size,
      online: getAggregatedUserPresence(userId) === 'online'
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName))

  const joinedGroupIds = new Set<string>()
  for (const group of listUserGroups(db)) {
    if (localUserId && listGroupMembers(db, group.groupId).some((m) => m.userId === localUserId)) {
      joinedGroupIds.add(group.groupId)
    }
  }

  const groupMap = new Map<string, DiscoverSnapshot['groups'][number]>()
  for (const cached of listCachedDiscoverGroups()) {
    const { advert, ownerUserId, ownerDisplayName } = cached
    groupMap.set(advert.groupId, {
      groupId: advert.groupId,
      name: advert.name,
      type: advert.type,
      ownerUserId,
      ownerDisplayName,
      joined: joinedGroupIds.has(advert.groupId)
    })
  }

  const groups = [...groupMap.values()].sort((a, b) => {
    if (a.joined !== b.joined) return a.joined ? 1 : -1
    return a.name.localeCompare(b.name)
  })

  return { peers, groups }
}
