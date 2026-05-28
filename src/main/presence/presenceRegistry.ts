import type { DiscoveryPayload, HeartbeatPayload, UserPresence } from '../../shared/network/types.ts'
import {
  aggregateUserPresenceFromDevices,
  type DevicePresenceRecord
} from '../../shared/presence/aggregate.ts'
import { STUB_PEER_TTL_MS } from '../network/stub/constants.ts'

const byDevice = new Map<string, DevicePresenceRecord>()

function upsert(
  deviceId: string,
  userId: string,
  presence: UserPresence,
  updatedAt = Date.now()
): void {
  byDevice.set(deviceId, { deviceId, userId, presence, updatedAt })
}

export function touchLocalDevice(userId: string, deviceId: string, presence: UserPresence): void {
  upsert(deviceId, userId, presence)
}

export function touchRemoteHeartbeat(payload: HeartbeatPayload): void {
  upsert(payload.deviceId, payload.userId, payload.presence)
}

/** 节点发现刷新：活跃 peer 视为 online（心跳 away 且仍新鲜时保留 away） */
export function touchDiscoveryPeer(peer: DiscoveryPayload): void {
  const existing = byDevice.get(peer.deviceId)
  const now = Date.now()
  if (
    existing &&
    existing.presence === 'away' &&
    now - existing.updatedAt < STUB_PEER_TTL_MS / 3
  ) {
    upsert(peer.deviceId, peer.userId, 'away', existing.updatedAt)
    return
  }
  upsert(peer.deviceId, peer.userId, 'online', now)
}

export function pruneStaleDevices(now = Date.now()): void {
  for (const [deviceId, rec] of byDevice) {
    if (now - rec.updatedAt > STUB_PEER_TTL_MS) {
      byDevice.delete(deviceId)
    }
  }
}

export function getAggregatedUserPresence(userId: string, now = Date.now()): UserPresence {
  pruneStaleDevices(now)
  return aggregateUserPresenceFromDevices([...byDevice.values()], userId, now, STUB_PEER_TTL_MS)
}

export function resetPresenceRegistry(): void {
  byDevice.clear()
}
