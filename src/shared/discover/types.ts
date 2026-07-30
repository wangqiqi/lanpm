import type { GroupType } from '../navigation/types'
import type { DiscoveryReasonCode } from './discoveryHealth'

/** UDP / stub 发现包中广播的可加入群组 */
export interface DiscoverableGroupAdvert {
  groupId: string
  name: string
  type: GroupType
}

export interface DiscoverPeerView {
  userId: string
  displayName: string
  deviceCount: number
  online: boolean
}

export interface DiscoverGroupView {
  groupId: string
  name: string
  type: GroupType
  ownerUserId: string
  ownerDisplayName: string
  /** 本机是否已是成员 */
  joined: boolean
  /** 已提交入群申请、待群主审批 */
  joinPending?: boolean
}

/** Serialized discovery health for DiscoverModal (A5). */
export interface DiscoverHealthView {
  reason: DiscoveryReasonCode
  ok: boolean
  suggestManualPeer: boolean
  multicastOk: boolean | null
  lastError?: string
}

export interface DiscoverSnapshot {
  peers: DiscoverPeerView[]
  groups: DiscoverGroupView[]
  /** A5 · transport / empty-state health */
  health: DiscoverHealthView
  /** A5 · persisted seed host:port list */
  seeds: string[]
}
