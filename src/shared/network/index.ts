export type {
  DiscoveryPayload,
  HeartbeatPayload,
  NetworkTransport,
  SyncEnvelope,
  SyncMessageType,
  UserPresence
} from './types'
export type { NetworkMode, NetworkLinkState, NetworkStatusView } from './status'
export { NETWORK_IPC } from './status'
export {
  UDP_DISCOVERY_PORT,
  DEFAULT_TCP_LISTEN_PORT,
  DISCOVERY_INTERVAL_MS,
  HEARTBEAT_INTERVAL_MS,
  PEER_TTL_MS,
  RECONNECT_BACKOFF_MS
} from './constants'
