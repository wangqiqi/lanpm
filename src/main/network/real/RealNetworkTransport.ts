import type net from 'node:net'
import type {
  DiscoveryPayload,
  HeartbeatPayload,
  NetworkTransport,
  SyncEnvelope
} from '../../../shared/network/types'
import { assertPublishableSyncType } from '../../../shared/network/unimplementedSync.ts'
import {
  DISCOVERY_INTERVAL_MS,
  HEARTBEAT_INTERVAL_MS,
  RECONNECT_BACKOFF_MS
} from '../../../shared/network/constants.ts'
import { generateDhKeyPair } from '../../crypto/dhSession.ts'
import { rememberPeerGroups } from '../../discover/discoverGroupRegistry.ts'
import { getDiscoverableGroupsForAdvert } from '../../discover/advertProvider.ts'
import { refreshLanUserIds } from '../peerDirectory.ts'
import { MessageDedup } from '../stub/dedup.ts'
import { LamportClock } from '../stub/lamport.ts'
import {
  touchDiscoveryPeer,
  touchLocalDevice,
  touchRemoteHeartbeat
} from '../../presence/presenceRegistry.ts'
import { createTcpServer, PeerLink, type TcpPeerIdentity } from './peerLink.ts'
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
  private readonly globalHandlers = new Set<EnvelopeHandler>()
  private readonly links = new Map<string, PeerLink>()
  private readonly reconnectAttempt = new Map<string, number>()
  private readonly reconnectTimers = new Map<string, ReturnType<typeof setTimeout>>()
  /** TCP 握手 / peer_advert 识别的对端（跨子网手动节点） */
  private readonly tcpPeers = new Map<string, DiscoveryPayload>()
  private readonly manualHosts = new Map<string, { host: string; port: number }>()
  private discovery: UdpDiscovery | null = null
  private tcpServer: net.Server | null = null
  private tcpBindOk = false
  private tcpBindError: string | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private peerRefreshTimer: ReturnType<typeof setInterval> | null = null
  private started = false

  constructor(options: RealNetworkOptions) {
    this.deviceId = options.deviceId
    this.userId = options.userId
    this.displayName = options.displayName
    this.capabilities = options.capabilities ?? ['chat', 'file', 'task']
    this.listenPort = options.listenPort ?? 43_124
    this.disableUdp = options.disableUdp ?? false
  }

  private registerTcpPeer(peer: TcpPeerIdentity): void {
    if (!peer.deviceId || !peer.userId || peer.userId === '__lanpm_probe__') return
    const payload: DiscoveryPayload = {
      deviceId: peer.deviceId,
      userId: peer.userId,
      displayName: peer.displayName,
      listenPort: peer.listenPort,
      host: peer.host,
      capabilities: this.capabilities,
      groups: peer.groups
    }
    this.tcpPeers.set(peer.deviceId, payload)
    rememberPeerGroups(peer.userId, peer.displayName, peer.groups)
    touchDiscoveryPeer(payload)
  }

  private createPeerLink(options: {
    remoteHost?: string
    onEnvelope: (env: SyncEnvelope) => void
    onPeerReady?: (link: PeerLink, peer: TcpPeerIdentity) => void
    onClose: () => void
  }): PeerLink {
    const remoteHost = options.remoteHost
    let link!: PeerLink
    link = new PeerLink({
      local: {
        deviceId: this.deviceId,
        userId: this.userId,
        displayName: this.displayName
      },
      listenPort: this.listenPort,
      getAdvertGroups: () => getDiscoverableGroupsForAdvert(),
      keys: generateDhKeyPair(),
      onEnvelope: options.onEnvelope,
      onPeerIdentified: (peer) => {
        this.registerTcpPeer({ ...peer, host: peer.host ?? remoteHost })
      },
      onReady: (peer) => {
        this.registerTcpPeer({ ...peer, host: peer.host ?? remoteHost })
        if (remoteHost) {
          this.manualHosts.set(peer.deviceId, { host: remoteHost, port: peer.listenPort })
        }
        this.reconnectAttempt.delete(peer.deviceId)
        options.onPeerReady?.(link, peer)
      },
      onClose: options.onClose
    })
    return link
  }

  start(): void {
    if (this.started) return
    this.started = true

    this.tcpBindOk = false
    this.tcpBindError = null
    this.tcpServer = createTcpServer(
      this.listenPort,
      (socket) => this.onIncomingSocket(socket),
      (err) => {
        this.tcpBindOk = false
        this.tcpBindError = err.message
        if (err.code === 'EADDRINUSE') {
          console.warn(
            `[lanpm] TCP port ${this.listenPort} already in use — inbound peers unavailable; outbound manual connect still works`
          )
          return
        }
        console.error('[lanpm] TCP listen failed:', err.message)
      }
    )
    this.tcpServer.once('listening', () => {
      this.tcpBindOk = true
      this.tcpBindError = null
    })

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
    this.tcpPeers.clear()
    this.manualHosts.clear()
    this.tcpServer?.close()
    this.tcpServer = null
    this.tcpBindOk = false
    this.tcpBindError = null
    this.subscriptions.clear()
    this.globalHandlers.clear()
  }

  async publish(envelope: SyncEnvelope): Promise<void> {
    assertPublishableSyncType(envelope.type)
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

  subscribeAll(handler: (envelope: SyncEnvelope) => void): () => void {
    this.globalHandlers.add(handler)
    return () => this.globalHandlers.delete(handler)
  }

  async discoverPeers(): Promise<DiscoveryPayload[]> {
    if (!this.started) this.start()
    const merged = new Map<string, DiscoveryPayload>()
    for (const peer of this.discovery?.listPeers() ?? []) {
      merged.set(peer.deviceId, peer)
    }
    for (const peer of this.tcpPeers.values()) {
      merged.set(peer.deviceId, peer)
    }
    const peers = [...merged.values()]
    refreshLanUserIds(peers)
    for (const peer of peers) touchDiscoveryPeer(peer)
    return peers
  }

  getDiscoveryDiagnostics(): {
    udpDisabled: boolean
    bindOk: boolean
    tcpBindOk: boolean
    tcpBindError: string | null
    multicastOk: boolean | null
    lastBroadcastError: string | null
  } {
    if (this.disableUdp) {
      return {
        udpDisabled: true,
        bindOk: this.tcpBindOk,
        tcpBindOk: this.tcpBindOk,
        tcpBindError: this.tcpBindError,
        multicastOk: null,
        lastBroadcastError: null
      }
    }
    const d = this.discovery?.getDiagnostics()
    return {
      udpDisabled: false,
      bindOk: (d?.bindOk ?? false) || this.tcpBindOk,
      tcpBindOk: this.tcpBindOk,
      tcpBindError: this.tcpBindError,
      multicastOk: d?.multicastOk ?? null,
      lastBroadcastError: d?.lastBroadcastError ?? null
    }
  }

  async connectPeer(peer: DiscoveryPayload): Promise<void> {
    await this.ensureLink(peer)
  }

  async connectManualHost(host: string, port: number): Promise<void> {
    if (!this.started) this.start()

    const link = this.createPeerLink({
      remoteHost: host,
      onEnvelope: (env) => this.deliver(env),
      onPeerReady: (activeLink, peer) => {
        const prev = this.links.get(peer.deviceId)
        if (prev && prev !== activeLink) prev.close()
        this.links.set(peer.deviceId, activeLink)
      },
      onClose: () => {
        const id = link.getRemoteDeviceId()
        if (id && this.links.get(id) === link) {
          this.links.delete(id)
          if (this.manualHosts.has(id)) {
            const manual = this.manualHosts.get(id)!
            this.scheduleReconnect({
              deviceId: id,
              userId: this.tcpPeers.get(id)?.userId ?? '',
              displayName: this.tcpPeers.get(id)?.displayName ?? `${manual.host}:${manual.port}`,
              listenPort: manual.port,
              host: manual.host,
              capabilities: this.capabilities
            })
          }
        }
      }
    })

    await link.connectHost(host, port)
  }

  private onIncomingSocket(socket: net.Socket): void {
    const remoteHost = socket.remoteAddress ?? undefined
    const link = this.createPeerLink({
      remoteHost,
      onEnvelope: (env) => this.deliver(env),
      onPeerReady: (activeLink, peer) => {
        const prev = this.links.get(peer.deviceId)
        if (prev && prev !== activeLink) prev.close()
        this.links.set(peer.deviceId, activeLink)
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

    const link = this.createPeerLink({
      remoteHost: peer.host,
      onEnvelope: (env) => this.deliver(env),
      onPeerReady: (activeLink, identified) => {
        const prev = this.links.get(identified.deviceId)
        if (prev && prev !== activeLink) prev.close()
        this.links.set(identified.deviceId, activeLink)
      },
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
      this.tcpPeers.get(deviceId) ??
      (() => {
        const manual = this.manualHosts.get(deviceId)
        if (!manual) return undefined
        return {
          deviceId,
          userId: '',
          displayName: `${manual.host}:${manual.port}`,
          listenPort: manual.port,
          host: manual.host,
          capabilities: this.capabilities
        } satisfies DiscoveryPayload
      })()
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
    const manual = this.manualHosts.get(peer.deviceId)
    if (manual) {
      await this.connectManualHost(manual.host, manual.port)
      return
    }
    if (peer.host) {
      await this.connectManualHost(peer.host, peer.listenPort)
      return
    }
    await this.ensureLink(peer)
  }

  private refreshPeerConnections(): void {
    const merged = new Map<string, DiscoveryPayload>()
    for (const peer of this.discovery?.listPeers() ?? []) merged.set(peer.deviceId, peer)
    for (const peer of this.tcpPeers.values()) merged.set(peer.deviceId, peer)
    const peers = [...merged.values()]
    refreshLanUserIds(peers)
    for (const peer of peers) {
      if (!this.links.get(peer.deviceId)?.isReady()) {
        void this.reconnectPeer(peer).catch(() => undefined)
      }
    }
    for (const link of this.links.values()) {
      if (link.isReady()) link.sendPeerAdvert()
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

    const handlers = new Set<EnvelopeHandler>()
    if (envelope.groupId) {
      const groupHandlers = this.subscriptions.get(envelope.groupId)
      if (groupHandlers) {
        for (const h of groupHandlers) handlers.add(h)
      }
    }
    for (const h of this.globalHandlers) handlers.add(h)

    for (const handler of handlers) handler(envelope)
  }
}
