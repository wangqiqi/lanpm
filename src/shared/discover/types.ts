import type { GroupType } from '../navigation/types'

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
}

export interface DiscoverSnapshot {
  peers: DiscoverPeerView[]
  groups: DiscoverGroupView[]
}
