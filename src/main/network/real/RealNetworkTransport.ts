import type net from 'node:net'
import type {
  DiscoveryPayload,
  HeartbeatPayload,
  NetworkTransport,
  SyncEnvelope
} from '../../../shared/network/types'
import type { GroupType } from '../../../shared/navigation/types'
import { assertPublishableSyncType } from '../../../shared/network/unimplementedSync.ts'
import {
  DISCOVERY_INTERVAL_MS,
  DEFAULT_TCP_LISTEN_PORT,
  HEARTBEAT_INTERVAL_MS,
  RECONNECT_BACKOFF_MS
} from '../../../shared/network/constants.ts'
import { generateDhKeyPair } from '../../crypto/dhSession.ts'
import { rememberPeerGroups, listCachedDiscoverGroups } from '../../discover/discoverGroupRegistry.ts'
import { parseHostPort } from '../../../shared/network/manualPeer.ts'
import { getDiscoverableGroupsForAdvert } from '../../discover/advertProvider.ts'
import { refreshLanUserIds } from '../peerDirectory.ts'
import { MessageDedup } from '../stub/dedup.ts'
import { LamportClock } from '../stub/lamport.ts'
import {
  touchDiscoveryPeer,
  touchLocalDevice,
  touchRemoteHeartbeat
} from '../../presence/presenceRegistry.ts'
import { getLocalLanIp } from '../localIp.ts'
import {
  PairingSessionHost,
  type PairingSessionView
} from './pairingSession.ts'
import {
  GroupInviteSessionHost,
  type GroupInviteSessionView
} from './groupInviteSession.ts'
import type { GroupInviteFoundBody } from '../../../shared/group/groupInvite.ts'
import { pairingFoundToDiscovery } from '../../../shared/network/pairingTypes.ts'
import { createTcpServer, PeerLink, type TcpPeerIdentity } from './peerLink.ts'
import { UdpDiscovery } from './udpDiscovery.ts'
import {
  DISCOVER_RELAY_HOP_MAX,
  type DiscoverRelayPacket
} from '../../../shared/discover/discoverRelay.ts'
import {
  applyRelayGroups,
  collectNewSeedAddresses,
  mergeRelayPeers,
  relayPacketForForward
} from './discoverRelayApply.ts'

export type { PairingSessionView } from './pairingSession.ts'
export type { GroupInviteSessionView } from './groupInviteSession.ts'

type EnvelopeHandler = (envelope: SyncEnvelope) => void

export interface RealNetworkOptions {
  deviceId: string
  userId: string
  displayName: string
  listenPort?: number
  capabilities?: string[]
  /** 测试模式：跳过 UDP，仅 TCP */
  disableUdp?: boolean
  /** 持久化发现种子（host:port），用于 discover_relay */
  getRelaySeeds?: () => string[]
  /** 从中继学到的新种子写入持久化（由 main 注入） */
  onRelaySeedsLearned?: (addresses: string[]) => void
}

export class RealNetworkTransport implements NetworkTransport {
  private readonly deviceId: string
  private readonly userId: string
  private readonly displayName: string
  private readonly capabilities: string[]
  private readonly listenPort: number
  private readonly disableUdp: boolean
  private readonly getRelaySeeds: (() => string[]) | undefined
  private readonly onRelaySeedsLearned: ((addresses: string[]) => void) | undefined
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
  private readonly pairingHost: PairingSessionHost
  private readonly groupInviteHost: GroupInviteSessionHost
  private readonly knownSeedAddresses = new Set<string>()
  private started = false

  constructor(options: RealNetworkOptions) {
    this.deviceId = options.deviceId
    this.userId = options.userId
    this.displayName = options.displayName
    this.capabilities = options.capabilities ?? ['chat', 'file', 'task']
    this.listenPort = options.listenPort ?? 43_124
    this.disableUdp = options.disableUdp ?? false
    this.getRelaySeeds = options.getRelaySeeds
    this.onRelaySeedsLearned = options.onRelaySeedsLearned
    this.pairingHost = new PairingSessionHost({
      deviceId: this.deviceId,
      userId: this.userId,
      displayName: this.displayName,
      listenPort: this.listenPort,
      getGroups: () => getDiscoverableGroupsForAdvert(),
      getHost: () => getLocalLanIp() ?? undefined
    })
    this.groupInviteHost = new GroupInviteSessionHost({
      deviceId: this.deviceId,
      userId: this.userId,
      displayName: this.displayName,
      listenPort: this.listenPort,
      getHost: () => getLocalLanIp() ?? undefined
    })
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
    const link = new PeerLink({
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
      onPeerAdvert: (peer) => {
        this.registerTcpPeer({ ...peer, host: peer.host ?? remoteHost })
      },
      onReady: (peer) => {
        this.registerTcpPeer({ ...peer, host: peer.host ?? remoteHost })
        if (remoteHost) {
          this.manualHosts.set(peer.deviceId, { host: remoteHost, port: peer.listenPort })
        }
        this.reconnectAttempt.delete(peer.deviceId)
        options.onPeerReady?.(link, peer)
        link.sendPeerAdvert()
        link.sendDiscoverRelay(this.buildDiscoverRelayPacket())
      },
      onClose: options.onClose,
      onDiscoverRelay: (packet, fromDeviceId) => {
        this.handleDiscoverRelay(packet, fromDeviceId, link)
      },
      resolvePairingCode: (code, joinerDeviceId, joinerDisplayName) => {
        const result = this.pairingHost.handleResolve({
          code,
          joinerDeviceId,
          joinerDisplayName
        })
        if (result.status === 'ok') {
          return {
            ok: true,
            profile: {
              deviceId: result.body.deviceId,
              userId: result.body.userId,
              displayName: result.body.displayName,
              listenPort: result.body.listenPort,
              groups: result.body.groups
            }
          }
        }
        return { ok: false, reason: result.reason }
      }
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
        onPeer: (peer) => this.onDiscoveredPeer(peer),
        pairingHost: this.pairingHost,
        groupInviteHost: this.groupInviteHost
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
    this.pairingHost.cancel()
    for (const t of this.reconnectTimers.values()) clearTimeout(t)
    this.reconnectTimers.clear()
    for (const link of this.links.values()) link.close()
    this.links.clear()
    this.tcpPeers.clear()
    this.manualHosts.clear()
    this.knownSeedAddresses.clear()
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

  /** 发起方：开始分享群组连接码 */
  getListenPort(): number {
    return this.listenPort
  }

  startPairingSession(): PairingSessionView {
    if (!this.started) this.start()
    const view = this.pairingHost.start()
    this.discovery?.startPairingOffers()
    return view
  }

  /** 取消进行中的连接码分享 */
  cancelPairingSession(): void {
    this.pairingHost.cancel()
    this.discovery?.stopPairingOffers()
  }

  /** 群主：开始分享群邀请码 */
  startGroupInviteSession(
    groupId: string,
    groupName: string,
    groupType: GroupType
  ): GroupInviteSessionView {
    if (!this.started) this.start()
    const view = this.groupInviteHost.start(groupId, groupName, groupType)
    this.discovery?.startGroupInviteOffers()
    return view
  }

  cancelGroupInviteSession(groupId: string): void {
    this.groupInviteHost.cancel(groupId)
    if (this.groupInviteHost.listActiveGroupIds().length === 0) {
      this.discovery?.stopGroupInviteOffers()
    }
  }

  /**
   * 加入方：凭群邀请码查找群主广播的群组信息。
   */
  async joinWithGroupInviteCode(
    code: string,
    options?: { unicastHost?: string }
  ): Promise<GroupInviteFoundBody> {
    if (!this.started) this.start()

    if (!this.discovery) {
      throw new Error('group_invite_requires_udp')
    }

    return this.discovery.lookupGroupInviteCode(code, {
      unicastHost: options?.unicastHost
    })
  }

  /**
   * 加入方：凭连接码查找对端并建立 TCP。
   * @param unicastHost 跨网段时可单播到指定 IP
   */
  async joinWithPairingCode(
    code: string,
    options?: {
      unicastHost?: string
      unicastHosts?: string[]
      port?: number
      subnetScanBatch?: boolean
    }
  ): Promise<DiscoveryPayload> {
    if (!this.started) this.start()

    const hosts =
      options?.unicastHosts && options.unicastHosts.length > 0
        ? options.unicastHosts
        : options?.unicastHost
          ? [options.unicastHost]
          : undefined

    if (this.discovery) {
      try {
        const found =
          options?.subnetScanBatch && hosts?.length
            ? await this.discovery.lookupPairingCodeBatched(code, hosts)
            : await this.discovery.lookupPairingCode(
                code,
                hosts && hosts.length > 1
                  ? { unicastHosts: hosts }
                  : hosts?.length === 1
                    ? { unicastHost: hosts[0] }
                    : undefined
              )
        const peer = pairingFoundToDiscovery(found, this.capabilities)
        rememberPeerGroups(peer.userId, peer.displayName, peer.groups)
        touchDiscoveryPeer(peer)
        await this.connectManualHost(peer.host, peer.listenPort)
        this.tcpPeers.set(peer.deviceId, peer)
        return peer
      } catch {
        if (!hosts?.length || options?.subnetScanBatch) throw new Error('pairing_lookup_failed')
      }
    }

    if (hosts?.length && !options?.subnetScanBatch) {
      let lastError: unknown
      for (const host of hosts) {
        try {
          return await this.connectManualHostWithPairing(
            host,
            options?.port ?? DEFAULT_TCP_LISTEN_PORT,
            code
          )
        } catch (err) {
          lastError = err
        }
      }
      if (lastError instanceof Error) throw lastError
      throw new Error('pairing_lookup_failed')
    }

    throw new Error('pairing_requires_udp_or_host')
  }

  /** TCP pairing_resolve 兜底（跨网段 UDP 不可达时） */
  async connectManualHostWithPairing(
    host: string,
    port: number,
    code: string
  ): Promise<DiscoveryPayload> {
    if (!this.started) this.start()

    const link = this.createPeerLink({
      remoteHost: host,
      onEnvelope: (env) => this.deliver(env),
      onPeerReady: (activeLink, peer) => {
        const prev = this.links.get(peer.deviceId)
        if (prev && prev !== activeLink) prev.close()
        this.links.set(peer.deviceId, activeLink)
        this.manualHosts.set(peer.deviceId, { host, port: peer.listenPort })
      },
      onClose: () => {
        const id = link.getRemoteDeviceId()
        if (id && this.links.get(id) === link) {
          this.links.delete(id)
        }
      }
    })

    await link.connectHostWithPairing(host, port, {
      code,
      joinerDeviceId: this.deviceId,
      joinerDisplayName: this.displayName
    })

    const profile = link.getRemoteProfile()
    if (!profile?.userId) {
      throw new Error('pairing_resolve_no_profile')
    }

    const peer = pairingFoundToDiscovery(
      {
        pairingId: '',
        deviceId: profile.deviceId,
        userId: profile.userId,
        displayName: profile.displayName,
        listenPort: profile.listenPort,
        host,
        groups: profile.groups
      },
      this.capabilities
    )
    rememberPeerGroups(peer.userId, peer.displayName, peer.groups)
    touchDiscoveryPeer(peer)
    this.tcpPeers.set(peer.deviceId, peer)
    return peer
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
      if (link.isReady()) {
        link.sendPeerAdvert()
        link.sendDiscoverRelay(this.buildDiscoverRelayPacket())
      }
    }
  }

  private buildDiscoverRelayPacket(hop = DISCOVER_RELAY_HOP_MAX): DiscoverRelayPacket {
    const peerMap = new Map<string, DiscoveryPayload>()
    for (const peer of this.discovery?.listPeers() ?? []) peerMap.set(peer.deviceId, peer)
    for (const peer of this.tcpPeers.values()) peerMap.set(peer.deviceId, peer)
    peerMap.delete(this.deviceId)

    const peers = [...peerMap.values()]
      .filter((p) => p.userId && p.host)
      .map((p) => ({
        deviceId: p.deviceId,
        userId: p.userId,
        displayName: p.displayName,
        host: p.host!,
        listenPort: p.listenPort
      }))

    const groups = listCachedDiscoverGroups().map((cached) => ({
      ...cached.advert,
      ownerUserId: cached.ownerUserId,
      ownerDisplayName: cached.ownerDisplayName
    }))

    const seeds = new Set<string>(this.getRelaySeeds?.() ?? [])
    for (const manual of this.manualHosts.values()) {
      seeds.add(`${manual.host}:${manual.port}`)
    }

    return {
      v: 1,
      kind: 'discover_relay',
      hop,
      viaDeviceId: this.deviceId,
      peers,
      groups,
      seeds: seeds.size > 0 ? [...seeds] : undefined
    }
  }

  private handleDiscoverRelay(
    packet: DiscoverRelayPacket,
    fromDeviceId: string,
    sourceLink: PeerLink
  ): void {
    if (packet.viaDeviceId === this.deviceId) return

    mergeRelayPeers(this.tcpPeers, packet.peers, this.capabilities)
    applyRelayGroups(packet.groups)

    const newSeeds = collectNewSeedAddresses(packet.seeds, this.knownSeedAddresses)
    if (newSeeds.length > 0) {
      this.onRelaySeedsLearned?.(newSeeds)
    }
    for (const address of newSeeds) {
      try {
        const { host, port } = parseHostPort(address)
        void this.connectManualHost(host, port).catch(() => undefined)
      } catch {
        // skip malformed seed
      }
    }

    const forward = relayPacketForForward(packet, this.deviceId)
    if (!forward) return
    for (const link of this.links.values()) {
      if (!link.isReady() || link === sourceLink) continue
      link.sendDiscoverRelay(forward)
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
