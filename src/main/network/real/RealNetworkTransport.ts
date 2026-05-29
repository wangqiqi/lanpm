import type net from 'node:net'
import type {
  DiscoveryPayload,
  HeartbeatPayload,
  NetworkTransport,
  SyncEnvelope
} from '../../../shared/network/types'
import {
  DISCOVERY_INTERVAL_MS,
  HEARTBEAT_INTERVAL_MS,
  RECONNECT_BACKOFF_MS
} from '../../../shared/network/constants.ts'
import { generateDhKeyPair } from '../../crypto/dhSession.ts'
import { refreshLanUserIds } from '../peerDirectory.ts'
import { MessageDedup } from '../stub/dedup.ts'
import { LamportClock } from '../stub/lamport.ts'
import {
  touchDiscoveryPeer,
  touchLocalDevice,
  touchRemoteHeartbeat
} from '../../presence/presenceRegistry.ts'
import { createTcpServer, PeerLink } from './peerLink.ts'
import { UdpDiscovery } from './udpDiscovery.ts'

type EnvelopeHandler = (envelope: SyncEnvelope) => void

export interface RealNetworkOptions {
  deviceId: string
  userId: string
  displayName: string
  listenPort?: number
  capabilities?: string[]
  /** 测试模式：跳过 UDP，仅 TCP */
  disableUdp?: boolean
}

export class RealNetworkTransport implements NetworkTransport {
  private readonly deviceId: string
  private readonly userId: string
  private readonly displayName: string
  private readonly capabilities: string[]
  private readonly listenPort: number
  private readonly disableUdp: boolean
  private readonly dedup = new MessageDedup()
  private readonly lamport = new LamportClock()
  private readonly subscriptions = new Map<string, Set<EnvelopeHandler>>()
  private readonly links = new Map<string, PeerLink>()
  private readonly reconnectAttempt = new Map<string, number>()
  private readonly reconnectTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private discovery: UdpDiscovery | null = null
  private tcpServer: net.Server | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private peerRefreshTimer: ReturnType<typeof setInterval> | null = null
  private readonly manualPeers = new Map<string, DiscoveryPayload>()
  private started = false

  constructor(options: RealNetworkOptions) {
    this.deviceId = options.deviceId
    this.userId = options.userId
    this.displayName = options.displayName
    this.capabilities = options.capabilities ?? ['chat', 'file', 'task']
    this.listenPort = options.listenPort ?? 43_124
    this.disableUdp = options.disableUdp ?? false
  }

  start(): void {
    if (this.started) return
    this.started = true

    this.tcpServer = createTcpServer(this.listenPort, (socket) => this.onIncomingSocket(socket))

    if (!this.disableUdp) {
      this.discovery = new UdpDiscovery({
        deviceId: this.deviceId,
        userId: this.userId,
        displayName: this.displayName,
        listenPort: this.listenPort,
        capabilities: this.capabilities,
        onPeer: (peer) => this.onDiscoveredPeer(peer)
      })
      this.discovery.start()
    }

    this.heartbeatTimer = setInterval(() => this.publishHeartbeat(), HEARTBEAT_INTERVAL_MS)
    this.peerRefreshTimer = setInterval(() => this.refreshPeerConnections(), DISCOVERY_INTERVAL_MS)
    touchLocalDevice(this.userId, this.deviceId, 'online')
  }

  stop(): void {
    if (!this.started) return
    this.started = false
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
    if (this.peerRefreshTimer) clearInterval(this.peerRefreshTimer)
    this.heartbeatTimer = null
    this.peerRefreshTimer = null
    this.discovery?.stop()
    this.discovery = null
    for (const t of this.reconnectTimers.values()) clearTimeout(t)
    this.reconnectTimers.clear()
    for (const link of this.links.values()) link.close()
    this.links.clear()
    this.tcpServer?.close()
    this.tcpServer = null
    this.subscriptions.clear()
  }

  async publish(envelope: SyncEnvelope): Promise<void> {
    if (!this.started) this.start()
    const withClock: SyncEnvelope = {
      ...envelope,
      lamportTs: envelope.lamportTs ?? this.lamport.tick(),
      senderDeviceId: envelope.senderDeviceId || this.deviceId,
      senderUserId: envelope.senderUserId || this.userId
    }

    for (const link of this.links.values()) {
      if (link.isReady()) link.send(withClock)
    }
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

  async discoverPeers(): Promise<DiscoveryPayload[]> {
    if (!this.started) this.start()
    const merged = new Map<string, DiscoveryPayload>()
    for (const peer of this.discovery?.listPeers() ?? []) {
      merged.set(peer.deviceId, peer)
    }
    for (const peer of this.manualPeers.values()) {
      merged.set(peer.deviceId, peer)
    }
    const peers = [...merged.values()]
    refreshLanUserIds(peers)
    for (const peer of peers) touchDiscoveryPeer(peer)
    return peers
  }

  /** 测试辅助：手动接入对端 */
  async connectPeer(peer: DiscoveryPayload): Promise<void> {
    await this.ensureLink(peer)
  }

  /** docs/02 §13.2 — 手动 IP:端口 建链（VPN / 跨子网） */
  async connectManualHost(host: string, port: number): Promise<void> {
    if (!this.started) this.start()

    const link = new PeerLink({
      local: {
        deviceId: this.deviceId,
        userId: this.userId,
        displayName: this.displayName
      },
      keys: generateDhKeyPair(),
      onEnvelope: (env) => this.deliver(env),
      onReady: (remoteDeviceId) => {
        const prev = this.links.get(remoteDeviceId)
        if (prev && prev !== link) prev.close()
        this.links.set(remoteDeviceId, link)
        const peer: DiscoveryPayload = {
          deviceId: remoteDeviceId,
          userId: '',
          displayName: `${host}:${port}`,
          listenPort: port,
          host,
          capabilities: this.capabilities
        }
        this.manualPeers.set(remoteDeviceId, peer)
        touchDiscoveryPeer(peer)
        this.reconnectAttempt.delete(remoteDeviceId)
      },
      onClose: () => {
        const id = link.getRemoteDeviceId()
        if (id && this.links.get(id) === link) {
          this.links.delete(id)
          const peer = this.manualPeers.get(id)
          if (peer) this.scheduleReconnect(peer)
        }
      }
    })

    await link.connectHost(host, port)
    const remoteId = link.getRemoteDeviceId()
    if (remoteId) this.links.set(remoteId, link)
  }

  private onIncomingSocket(socket: import('node:net').Socket): void {
    const link = new PeerLink({
      local: {
        deviceId: this.deviceId,
        userId: this.userId,
        displayName: this.displayName
      },
      keys: generateDhKeyPair(),
      onEnvelope: (env) => this.deliver(env),
      onReady: (remoteDeviceId) => {
        const prev = this.links.get(remoteDeviceId)
        if (prev && prev !== link) prev.close()
        this.links.set(remoteDeviceId, link)
      },
      onClose: () => {
        const id = link.getRemoteDeviceId()
        if (id && this.links.get(id) === link) {
          this.links.delete(id)
          this.scheduleReconnectByDevice(id)
        }
      }
    })
    link.attachIncoming(socket)
  }

  private onDiscoveredPeer(peer: DiscoveryPayload): void {
    touchDiscoveryPeer(peer)
    void this.ensureLink(peer).catch(() => undefined)
  }

  private async ensureLink(peer: DiscoveryPayload): Promise<void> {
    if (peer.deviceId === this.deviceId) return
    if (this.deviceId > peer.deviceId) return

    const existing = this.links.get(peer.deviceId)
    if (existing?.isReady()) return
    if (existing) existing.close()

    const link = new PeerLink({
      local: {
        deviceId: this.deviceId,
        userId: this.userId,
        displayName: this.displayName
      },
      keys: generateDhKeyPair(),
      onEnvelope: (env) => this.deliver(env),
      onClose: () => {
        this.links.delete(peer.deviceId)
        this.scheduleReconnect(peer)
      }
    })

    this.links.set(peer.deviceId, link)
    try {
      await link.connect(peer)
      this.reconnectAttempt.delete(peer.deviceId)
    } catch {
      this.links.delete(peer.deviceId)
      this.scheduleReconnect(peer)
    }
  }

  private scheduleReconnectByDevice(deviceId: string): void {
    const peer =
      this.discovery?.listPeers().find((p) => p.deviceId === deviceId) ??
      this.manualPeers.get(deviceId)
    if (peer) this.scheduleReconnect(peer)
  }

  private scheduleReconnect(peer: DiscoveryPayload): void {
    if (!this.started) return
    const prev = this.reconnectTimers.get(peer.deviceId)
    if (prev) clearTimeout(prev)
    const attempt = this.reconnectAttempt.get(peer.deviceId) ?? 0
    const delay =
      RECONNECT_BACKOFF_MS[Math.min(attempt, RECONNECT_BACKOFF_MS.length - 1)] ?? 20_000
    this.reconnectAttempt.set(peer.deviceId, attempt + 1)
    const timer = setTimeout(() => {
      this.reconnectTimers.delete(peer.deviceId)
      void this.reconnectPeer(peer).catch(() => undefined)
    }, delay)
    this.reconnectTimers.set(peer.deviceId, timer)
  }

  private async reconnectPeer(peer: DiscoveryPayload): Promise<void> {
    if (peer.host && this.manualPeers.has(peer.deviceId)) {
      await this.connectManualHost(peer.host, peer.listenPort)
      return
    }
    await this.ensureLink(peer)
  }

  private refreshPeerConnections(): void {
    const merged = new Map<string, DiscoveryPayload>()
    for (const peer of this.discovery?.listPeers() ?? []) merged.set(peer.deviceId, peer)
    for (const peer of this.manualPeers.values()) merged.set(peer.deviceId, peer)
    const peers = [...merged.values()]
    refreshLanUserIds(peers)
    for (const peer of peers) {
      if (!this.links.get(peer.deviceId)?.isReady()) {
        void this.reconnectPeer(peer).catch(() => undefined)
      }
    }
  }

  private publishHeartbeat(): void {
    touchLocalDevice(this.userId, this.deviceId, 'online')
    const payload: HeartbeatPayload = {
      userId: this.userId,
      deviceId: this.deviceId,
      presence: 'online'
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

    if (!envelope.groupId) return
    const handlers = this.subscriptions.get(envelope.groupId)
    if (!handlers) return
    for (const handler of handlers) handler(envelope)
  }
}
