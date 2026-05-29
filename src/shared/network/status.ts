export type NetworkMode = 'stub' | 'real'

export type NetworkLinkState = 'online' | 'offline' | 'stub'

export interface NetworkStatusView {
  mode: NetworkMode
  linkState: NetworkLinkState
  peerCount: number
  /** 本机局域网 IPv4，无可用地址时为 null */
  localIp: string | null
}

export const NETWORK_IPC = {
  getStatus: 'network:getStatus',
  reconnect: 'network:reconnect',
  connectManualPeer: 'network:connectManualPeer'
} as const
