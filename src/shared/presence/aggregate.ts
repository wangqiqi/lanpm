import type { UserPresence } from '../network/types'

const PRESENCE_RANK: Record<UserPresence, number> = {
  online: 3,
  away: 2,
  offline: 1
}

/** 按 userId 聚合多设备：任一 online → online；否则任一 away → away */
export function aggregateUserPresence(presences: UserPresence[]): UserPresence {
  if (presences.length === 0) return 'offline'
  return presences.reduce(
    (best, p) => (PRESENCE_RANK[p] > PRESENCE_RANK[best] ? p : best),
    'offline' as UserPresence
  )
}

export interface DevicePresenceRecord {
  userId: string
  deviceId: string
  presence: UserPresence
  updatedAt: number
}

/** 从设备级记录聚合指定用户的在线态（超 TTL 的设备不计入） */
export function aggregateUserPresenceFromDevices(
  devices: DevicePresenceRecord[],
  userId: string,
  now: number,
  ttlMs: number
): UserPresence {
  const active = devices.filter((d) => d.userId === userId && now - d.updatedAt <= ttlMs)
  if (active.length === 0) return 'offline'
  return aggregateUserPresence(active.map((d) => d.presence))
}
