import type { DiscoverableGroupAdvert } from '../discover/types'

/** Sync message kinds — aligned with docs/04 §2 */
export type SyncMessageType =
  | 'discovery'
  | 'heartbeat'
  | 'chat'
  | 'chat_recall'
  | 'read_receipt'
  | 'task_patch'
  | 'task_dep_patch'
  | 'task_sync_request'
  | 'task_sync_batch'
  | 'task_crdt'
  | 'file_meta'
  | 'file_pull_request'
  | 'file_chunk'
  | 'member_event'
  | 'group_key_rotate'
  | 'chat_sync_request'
  | 'chat_sync_batch'

/** docs/04 §6.1 */
export interface SyncEnvelope {
  version: 1
  type: SyncMessageType
  msgId: string
  senderUserId: string
  senderDeviceId: string
  groupId?: string
  ts: string
  lamportTs?: number
  keyVersion?: number
  payload: unknown
  nonce: string
  authTag: string
}

/** docs/04 §6.2 — UDP discovery (Stub uses peer registry file) */
export interface DiscoveryPayload {
  deviceId: string
  userId: string
  displayName: string
  listenPort: number
  capabilities: string[]
  /** UDP 发现来源 IP（M6 真网 P2P 建链） */
  host?: string
  /** 本机可局域网发现的群组（autoDiscover） */
  groups?: DiscoverableGroupAdvert[]
}

export type UserPresence = 'online' | 'away' | 'offline'

export interface HeartbeatPayload {
  userId: string
  deviceId: string
  presence: UserPresence
}

/** docs/04 §6.4 */
export interface NetworkTransport {
  publish(envelope: SyncEnvelope): Promise<void>
  subscribe(groupId: string, handler: (envelope: SyncEnvelope) => void): () => void
  discoverPeers(): Promise<DiscoveryPayload[]>
}
