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
  /** 跨网段时可只报尾段（如 `109`） */
  localIpTail?: string
}

export interface PairingJoinInput {
  code: string
  /** 勾选跨网段：启用尾段解析 / 子网广播探测 */
  crossSubnet?: boolean
  /** 跨网段：对方完整 IP、尾段（如 `109`）或 host:port */
  unicastHost?: string
  port?: number
  /** 高级：对路由可达 /24 逐 host 扫描（慢，默认关） */
  subnetScan?: boolean
}

export interface PairingJoinResult {
  deviceId: string
  userId: string
  displayName: string
  host: string
  listenPort: number
  groupIds: string[]
}
