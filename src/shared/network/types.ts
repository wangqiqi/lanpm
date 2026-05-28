/** Sync message kinds — aligned with docs/04 §2 */
export type SyncMessageType =
  | 'discovery'
  | 'heartbeat'
  | 'chat'
  | 'read_receipt'
  | 'task_patch'
  | 'task_crdt'
  | 'file_meta'
  | 'file_chunk'
  | 'member_event'
  | 'group_key_rotate'

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
