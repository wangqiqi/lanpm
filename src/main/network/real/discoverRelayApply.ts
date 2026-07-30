import type { DiscoveryPayload } from '../../../shared/network/types'
import type {
  DiscoverRelayGroupEntry,
  DiscoverRelayPacket,
  DiscoverRelayPeer
} from '../../../shared/discover/discoverRelay'
import { rememberPeerGroups } from '../../discover/discoverGroupRegistry.ts'
import { parseHostPort } from '../../../shared/network/manualPeer.ts'
import { touchDiscoveryPeer } from '../../presence/presenceRegistry.ts'

export function mergeRelayPeers(
  existing: Map<string, DiscoveryPayload>,
  incoming: DiscoverRelayPeer[],
  capabilities: string[]
): void {
  for (const peer of incoming) {
    if (!peer.deviceId || !peer.userId || peer.userId === '__lanpm_probe__') continue
    const payload: DiscoveryPayload = {
      deviceId: peer.deviceId,
      userId: peer.userId,
      displayName: peer.displayName,
      listenPort: peer.listenPort,
      host: peer.host,
      capabilities
    }
    existing.set(peer.deviceId, payload)
    touchDiscoveryPeer(payload)
  }
}

export function applyRelayGroups(groups: DiscoverRelayGroupEntry[]): void {
  const byOwner = new Map<string, { displayName: string; adverts: DiscoverRelayGroupEntry[] }>()
  for (const entry of groups) {
    if (!entry.groupId || !entry.name) continue
    const bucket = byOwner.get(entry.ownerUserId)
    if (bucket) {
      bucket.adverts.push(entry)
      if (entry.ownerDisplayName) bucket.displayName = entry.ownerDisplayName
    } else {
      byOwner.set(entry.ownerUserId, {
        displayName: entry.ownerDisplayName || entry.ownerUserId,
        adverts: [entry]
      })
    }
  }
  for (const [ownerUserId, { displayName, adverts }] of byOwner) {
    rememberPeerGroups(
      ownerUserId,
      displayName,
      adverts.map(({ groupId, name, type }) => ({ groupId, name, type }))
    )
  }
}

export function collectNewSeedAddresses(
  seeds: string[] | undefined,
  known: Set<string>
): string[] {
  if (!seeds?.length) return []
  const next: string[] = []
  for (const raw of seeds) {
    const trimmed = raw.trim()
    if (!trimmed || known.has(trimmed)) continue
    try {
      parseHostPort(trimmed)
      known.add(trimmed)
      next.push(trimmed)
    } catch {
      // skip malformed
    }
  }
  return next
}

export function relayPacketForForward(
  packet: DiscoverRelayPacket,
  selfDeviceId: string
): DiscoverRelayPacket | null {
  if (packet.hop <= 0) return null
  if (packet.viaDeviceId === selfDeviceId) return null
  return {
    ...packet,
    hop: packet.hop - 1,
    viaDeviceId: selfDeviceId
  }
}
