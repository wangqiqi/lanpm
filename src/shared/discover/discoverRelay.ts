import type { DiscoverableGroupAdvert } from './types'

/** 发现中继最大跳数（plan 拍板 ≤2） */
export const DISCOVER_RELAY_HOP_MAX = 2

export interface DiscoverRelayPeer {
  deviceId: string
  userId: string
  displayName: string
  host: string
  listenPort: number
}

export interface DiscoverRelayGroupEntry extends DiscoverableGroupAdvert {
  ownerUserId: string
  ownerDisplayName: string
}

export interface DiscoverRelayPacket {
  v: 1
  kind: 'discover_relay'
  hop: number
  viaDeviceId: string
  peers: DiscoverRelayPeer[]
  groups: DiscoverRelayGroupEntry[]
  seeds?: string[]
}

export function isDiscoverRelayPacket(msg: unknown): msg is DiscoverRelayPacket {
  if (!msg || typeof msg !== 'object') return false
  const m = msg as DiscoverRelayPacket
  return m.v === 1 && m.kind === 'discover_relay' && typeof m.hop === 'number'
}
