import type { DiscoverableGroupAdvert } from './types'

/** Renderer ↔ main：分享连接码会话 */
export interface PairingSessionView {
  pairingId: string
  code: string
  codeDisplay: string
  expiresAt: string
  groups: DiscoverableGroupAdvert[]
  /** 跨网段时展示给对方的本机 IP */
  localIp?: string
}

export interface PairingJoinInput {
  code: string
  /** 跨网段：对方 IP 或 host:port */
  unicastHost?: string
  port?: number
}

export interface PairingJoinResult {
  deviceId: string
  userId: string
  displayName: string
  host: string
  listenPort: number
  groupIds: string[]
}
