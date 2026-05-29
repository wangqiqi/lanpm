export type NetworkMode = 'stub' | 'real'

export type NetworkLinkState = 'online' | 'offline' | 'stub'

export interface NetworkStatusView {
  mode: NetworkMode
  linkState: NetworkLinkState
  peerCount: number
}

export const NETWORK_IPC = {
  getStatus: 'network:getStatus',
  reconnect: 'network:reconnect'
} as const
