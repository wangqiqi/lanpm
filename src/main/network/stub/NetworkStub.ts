import {
  appendFileSync,
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  statSync,
  unlinkSync,
  writeFileSync
} from 'fs'
import type { DiscoveryPayload, HeartbeatPayload, NetworkTransport, SyncEnvelope } from '../../../shared/network/index.ts'
import {
  STUB_BUS_DIR,
  STUB_BUS_FILE,
  STUB_BUS_MAX_BYTES,
  STUB_DISCOVERY_INTERVAL_MS,
  STUB_HEARTBEAT_INTERVAL_MS,
  STUB_LISTEN_PORT,
  STUB_PEERS_DIR
} from './constants.ts'
import { MessageDedup } from './dedup.ts'
import { LamportClock } from './lamport.ts'
import { join } from 'path'
import { getDiscoverableGroupsForAdvert } from '../../discover/advertProvider.ts'
import { rememberPeerGroups } from '../../discover/discoverGroupRegistry.ts'
import { readPeerRecords, refreshLanUserIds } from './peerRegistry.ts'
import {
  touchDiscoveryPeer,
  touchLocalDevice,
  touchRemoteHeartbeat
} from '../../presence/presenceRegistry.ts'

interface BusRecord {
  envelope: SyncEnvelope
}

type EnvelopeHandler = (envelope: SyncEnvelope) => void

export interface NetworkStubOptions {
  deviceId: string
  userId: string
  displayName: string
  capabilities?: string[]
}

export class NetworkStub implements NetworkTransport {
  private readonly deviceId: string
  private readonly userId: string
  private readonly displayName: string
  private readonly capabilities: string[]
  private readonly dedup = new MessageDedup()
  private readonly lamport = new LamportClock()
  private readonly subscriptions = new Map<string, Set<EnvelopeHandler>>()
  private readonly globalHandlers = new Set<EnvelopeHandler>()
  private peerFilePath: string | null = null
  private busOffset = 0
  private busFd: number | null = null
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private discoveryTimer: ReturnType<typeof setInterval> | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private localPresence: 'online' | 'away' = 'online'
  private started = false

  constructor(options: NetworkStubOptions) {
    this.deviceId = options.deviceId
    this.userId = options.userId
    this.displayName = options.displayName
    this.capabilities = options.capabilities ?? ['chat', 'file', 'task']
  }

  start(): void {
    if (this.started) return
    this.started = true
    mkdirSync(STUB_PEERS_DIR, { recursive: true })
    mkdirSync(STUB_BUS_DIR, { recursive: true })
    if (!existsSync(STUB_BUS_FILE)) {
      writeFileSync(STUB_BUS_FILE, '', 'utf8')
    }

    this.peerFilePath = `${STUB_PEERS_DIR}/${this.deviceId}.json`
    this.busFd = openSync(STUB_BUS_FILE, 'r')
    this.busOffset = statSync(STUB_BUS_FILE).size

    this.writePeerRecord()
    this.publishHeartbeat()
    this.discoveryTimer = setInterval(() => this.writePeerRecord(), STUB_DISCOVERY_INTERVAL_MS)
    this.heartbeatTimer = setInterval(() => this.publishHeartbeat(), STUB_HEARTBEAT_INTERVAL_MS)
    this.pollTimer = setInterval(() => this.pollBus(), 200)
  }

  stop(): void {
    if (!this.started) return
    this.started = false
    if (this.discoveryTimer) clearInterval(this.discoveryTimer)
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
    if (this.pollTimer) clearInterval(this.pollTimer)
    this.discoveryTimer = null
    this.heartbeatTimer = null
    this.pollTimer = null
    if (this.busFd !== null) {
      closeSync(this.busFd)
      this.busFd = null
    }
    if (this.peerFilePath && existsSync(this.peerFilePath)) {
      try {
        unlinkSync(this.peerFilePath)
      } catch {
        // ignore
      }
    }
    this.peerFilePath = null
    this.subscriptions.clear()
    this.globalHandlers.clear()
  }

  private writePeerRecord(): void {
    if (!this.peerFilePath) return
    const payload: DiscoveryPayload = {
      deviceId: this.deviceId,
      userId: this.userId,
      displayName: this.displayName,
      listenPort: STUB_LISTEN_PORT,
      capabilities: this.capabilities,
      groups: getDiscoverableGroupsForAdvert()
    }
    writeFileSync(this.peerFilePath, JSON.stringify(payload), 'utf8')
    const peers = readPeerRecords(this.deviceId)
    for (const peer of peers) {
      touchDiscoveryPeer(peer)
      rememberPeerGroups(peer.userId, peer.displayName, peer.groups)
    }
    refreshLanUserIds(peers)
  }

  private publishHeartbeat(): void {
    touchLocalDevice(this.userId, this.deviceId, this.localPresence)
    const payload: HeartbeatPayload = {
      userId: this.userId,
      deviceId: this.deviceId,
      presence: this.localPresence
    }
    const envelope: SyncEnvelope = {
      version: 1,
      type: 'heartbeat',
      msgId: `hb_${this.deviceId}_${Date.now()}`,
      senderUserId: this.userId,
      senderDeviceId: this.deviceId,
      ts: new Date().toISOString(),
      payload,
      nonce: '',
      authTag: ''
    }
    void this.publish(envelope)
  }

  private pollBus(): void {
    if (this.busFd === null) return
    let size: number
    try {
      size = statSync(STUB_BUS_FILE).size
    } catch {
      return
    }
    if (size <= this.busOffset) return

    const len = size - this.busOffset
    const buf = Buffer.alloc(len)
    readSync(this.busFd, buf, 0, len, this.busOffset)
    this.busOffset = size

    const chunk = buf.toString('utf8')
    const lines = chunk.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        const record = JSON.parse(trimmed) as BusRecord
        this.deliver(record.envelope)
      } catch {
        // skip malformed line
      }
    }

    if (size > STUB_BUS_MAX_BYTES) {
      const full = readFileSync(STUB_BUS_FILE)
      const tail = full.subarray(Math.max(0, full.length - STUB_BUS_MAX_BYTES / 2))
      writeFileSync(STUB_BUS_FILE, tail)
      this.busOffset = tail.length
      if (this.busFd !== null) {
        closeSync(this.busFd)
        this.busFd = openSync(STUB_BUS_FILE, 'r')
      }
    }
  }

  private deliver(envelope: SyncEnvelope): void {
    if (envelope.type === 'heartbeat') {
      if (envelope.senderDeviceId !== this.deviceId) {
        touchRemoteHeartbeat(envelope.payload as HeartbeatPayload)
      }
      return
    }

    if (envelope.senderDeviceId === this.deviceId) return
    if (!this.dedup.remember(envelope.senderDeviceId, envelope.msgId)) return

    this.lamport.observe(envelope.lamportTs)

    const handlers = new Set<EnvelopeHandler>()
    if (envelope.groupId) {
      const groupHandlers = this.subscriptions.get(envelope.groupId)
      if (groupHandlers) {
        for (const h of groupHandlers) handlers.add(h)
      }
    }
    for (const h of this.globalHandlers) handlers.add(h)

    for (const handler of handlers) {
      handler(envelope)
    }
  }

  async publish(envelope: SyncEnvelope): Promise<void> {
    if (!this.started) this.start()
    const withClock: SyncEnvelope = {
      ...envelope,
      lamportTs: envelope.lamportTs ?? this.lamport.tick(),
      senderDeviceId: envelope.senderDeviceId || this.deviceId,
      senderUserId: envelope.senderUserId || this.userId
    }
    const record: BusRecord = { envelope: withClock }
    appendFileSync(STUB_BUS_FILE, `${JSON.stringify(record)}\n`, 'utf8')
  }

  subscribe(groupId: string, handler: (envelope: SyncEnvelope) => void): () => void {
    let set = this.subscriptions.get(groupId)
    if (!set) {
      set = new Set()
      this.subscriptions.set(groupId, set)
    }
    set.add(handler)
    return () => {
      set?.delete(handler)
      if (set && set.size === 0) this.subscriptions.delete(groupId)
    }
  }

  /** Test helper — receive any group */
  subscribeAll(handler: (envelope: SyncEnvelope) => void): () => void {
    this.globalHandlers.add(handler)
    return () => this.globalHandlers.delete(handler)
  }

  async discoverPeers(): Promise<DiscoveryPayload[]> {
    if (!this.started) this.start()
    this.writePeerRecord()
    return readPeerRecords(this.deviceId)
  }

  /** Stub：登记手动节点，供 discoverPeers 与联调脚本使用 */
  registerManualPeer(host: string, port: number, displayName?: string): void {
    if (!this.started) this.start()
    mkdirSync(STUB_PEERS_DIR, { recursive: true })
    const deviceId = `manual-${host.replace(/[^a-zA-Z0-9._-]/g, '_')}-${port}`
    const payload: DiscoveryPayload = {
      deviceId,
      userId: 'manual-peer',
      displayName: displayName ?? `${host}:${port}`,
      listenPort: port,
      host,
      capabilities: this.capabilities
    }
    writeFileSync(join(STUB_PEERS_DIR, `${deviceId}.json`), JSON.stringify(payload), 'utf8')
    touchDiscoveryPeer(payload)
    refreshLanUserIds([payload])
  }

  getLamportValue(): number {
    return this.lamport.peek()
  }
}
