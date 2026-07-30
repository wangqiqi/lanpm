import dgram from 'node:dgram'
import type { DiscoveryPayload } from '../../../shared/network/types.ts'
import { DISCOVERY_INTERVAL_MS, PEER_TTL_MS, UDP_DISCOVERY_PORT, UDP_MULTICAST_ADDR } from '../../../shared/network/constants.ts'
import type { PairingFoundBody } from '../../../shared/network/pairingTypes.ts'
import { getLocalLanIp, resolvePeerHost } from '../localIp.ts'
import { rememberPeerGroups } from '../../discover/discoverGroupRegistry.ts'
import { getDiscoverableGroupsForAdvert } from '../../discover/advertProvider.ts'
import type { PairingSessionHost } from './pairingSession.ts'
import { PairingUdpController } from './pairingUdp.ts'
import type { GroupInviteSessionHost } from './groupInviteSession.ts'
import { GroupInviteUdpController } from './groupInviteUdp.ts'

export interface UdpDiscoveryOptions {
  deviceId: string
  userId: string
  displayName: string
  listenPort: number
  capabilities?: string[]
  onPeer: (peer: DiscoveryPayload) => void
  /** 可选：发起方配对会话 */
  pairingHost?: PairingSessionHost
  /** 可选：群邀请码会话 */
  groupInviteHost?: GroupInviteSessionHost
  /** 测试：固定 LAN IP（VirtualLan） */
  getLanIp?: () => string | undefined
  /** 测试：自定义 UDP socket（VirtualLan） */
  createSocket?: () => dgram.Socket
}

export interface UdpDiscoveryDiagnostics {
  bindOk: boolean
  multicastOk: boolean | null
  lastBroadcastError: string | null
  peerCount: number
}

interface PeerCacheEntry {
  peer: DiscoveryPayload
  updatedAt: number
}

export class UdpDiscovery {
  private readonly opts: UdpDiscoveryOptions
  private readonly peers = new Map<string, PeerCacheEntry>()
  private readonly disableMulticast: boolean
  private pairingController: PairingUdpController | null = null
  private groupInviteController: GroupInviteUdpController | null = null
  private socket: dgram.Socket | null = null
  private broadcastTimer: ReturnType<typeof setInterval> | null = null
  private pruneTimer: ReturnType<typeof setInterval> | null = null
  private bindOk = false
  private multicastOk: boolean | null = null
  private lastBroadcastError: string | null = null

  constructor(opts: UdpDiscoveryOptions) {
    this.opts = opts
    this.disableMulticast = process.env.LANPM_DISABLE_MULTICAST === '1'
    this.multicastOk = this.disableMulticast ? null : true
    if (opts.pairingHost) {
      this.pairingController = new PairingUdpController(
        () => this.socket,
        this.disableMulticast,
        opts.pairingHost,
        { deviceId: opts.deviceId, displayName: opts.displayName }
      )
    } else {
      this.pairingController = new PairingUdpController(
        () => this.socket,
        this.disableMulticast,
        null,
        { deviceId: opts.deviceId, displayName: opts.displayName }
      )
    }
    this.groupInviteController = new GroupInviteUdpController(
      () => this.socket,
      this.disableMulticast,
      opts.groupInviteHost ?? null,
      { deviceId: opts.deviceId, displayName: opts.displayName }
    )
  }

  start(): void {
    if (this.socket) return
    const socket = this.opts.createSocket?.() ?? dgram.createSocket({ type: 'udp4', reuseAddr: true })
    this.socket = socket

    socket.on('message', (buf, rinfo) => {
      if (this.groupInviteController?.handleMessage(buf, rinfo)) return
      if (this.pairingController?.handleMessage(buf, rinfo)) return
      try {
        const packet = JSON.parse(buf.toString('utf8')) as {
          v?: number
          kind?: string
          payload?: DiscoveryPayload
        }
        if (packet.v !== 1 || packet.kind !== 'discovery' || !packet.payload?.deviceId) return
        if (packet.payload.deviceId === this.opts.deviceId) return
        const host = resolvePeerHost(packet.payload.host, rinfo.address)
        this.remember({ ...packet.payload, host })
      } catch {
        // ignore
      }
    })

    socket.on('error', (err) => {
      console.warn('[lanpm] UDP discovery error:', err.message)
      this.bindOk = false
      this.lastBroadcastError = err.message
    })

    socket.bind(UDP_DISCOVERY_PORT, () => {
      this.bindOk = true
      socket.setBroadcast(true)
      if (!this.disableMulticast) {
        try {
          socket.addMembership(UDP_MULTICAST_ADDR)
          this.multicastOk = true
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          console.warn('[lanpm] UDP multicast join failed (broadcast only):', msg)
          this.multicastOk = false
        }
      }
    })

    this.broadcastTimer = setInterval(() => this.broadcast(), DISCOVERY_INTERVAL_MS)
    this.pruneTimer = setInterval(() => this.prune(), PEER_TTL_MS)
    this.broadcast()
  }

  stop(): void {
    if (this.broadcastTimer) clearInterval(this.broadcastTimer)
    if (this.pruneTimer) clearInterval(this.pruneTimer)
    this.broadcastTimer = null
    this.pruneTimer = null
    this.pairingController?.stopOfferBroadcast()
    this.groupInviteController?.stopOfferBroadcast()
    this.pairingController?.cancelPendingLookup()
    this.groupInviteController?.cancelPendingLookup()
    this.socket?.close()
    this.socket = null
    this.peers.clear()
    this.bindOk = false
  }

  listPeers(): DiscoveryPayload[] {
    this.prune()
    return [...this.peers.values()].map((e) => e.peer)
  }

  getDiagnostics(): UdpDiscoveryDiagnostics {
    this.prune()
    return {
      bindOk: this.bindOk,
      multicastOk: this.multicastOk,
      lastBroadcastError: this.lastBroadcastError,
      peerCount: this.peers.size
    }
  }

  startPairingOffers(): void {
    this.pairingController?.startOfferBroadcast()
  }

  stopPairingOffers(): void {
    this.pairingController?.stopOfferBroadcast()
  }

  stopGroupInviteOffers(): void {
    this.groupInviteController?.stopOfferBroadcast()
  }

  startGroupInviteOffers(): void {
    this.groupInviteController?.startOfferBroadcast()
  }

  lookupGroupInviteCode(code: string, options?: { unicastHost?: string }) {
    if (!this.groupInviteController) {
      return Promise.reject(new Error('group_invite_udp_unavailable'))
    }
    return this.groupInviteController.lookupGroupInviteCode(code, options)
  }

  cancelGroupInviteLookup(): void {
    this.groupInviteController?.cancelPendingLookup()
  }

  lookupPairingCode(
    code: string,
    options?: { unicastHost?: string; unicastHosts?: string[]; timeoutMs?: number }
  ): Promise<PairingFoundBody> {
    if (!this.pairingController) {
      return Promise.reject(new Error('pairing_udp_unavailable'))
    }
    return this.pairingController.lookupPairingCode(code, options)
  }

  lookupPairingCodeBatched(
    code: string,
    hosts: string[],
    options?: { batchSize?: number; batchTimeoutMs?: number }
  ): Promise<PairingFoundBody> {
    if (!this.pairingController) {
      return Promise.reject(new Error('pairing_udp_unavailable'))
    }
    return this.pairingController.lookupPairingCodeBatched(code, hosts, options)
  }

  cancelPairingLookup(): void {
    this.pairingController?.cancelPendingLookup()
  }

  private payload(): DiscoveryPayload {
    const host = this.opts.getLanIp?.() ?? getLocalLanIp() ?? undefined
    return {
      deviceId: this.opts.deviceId,
      userId: this.opts.userId,
      displayName: this.opts.displayName,
      listenPort: this.opts.listenPort,
      capabilities: this.opts.capabilities ?? ['chat', 'file', 'task'],
      host,
      groups: getDiscoverableGroupsForAdvert()
    }
  }

  private broadcast(): void {
    if (!this.socket) return
    const packet = JSON.stringify({ v: 1, kind: 'discovery', payload: this.payload() })
    const buf = Buffer.from(packet, 'utf8')
    this.socket.send(buf, UDP_DISCOVERY_PORT, '255.255.255.255', (err) => {
      if (err) {
        console.warn('[lanpm] UDP broadcast failed:', err.message)
        this.lastBroadcastError = err.message
      } else if (this.lastBroadcastError) {
        this.lastBroadcastError = null
      }
    })
    if (!this.disableMulticast) {
      this.socket.send(buf, UDP_DISCOVERY_PORT, UDP_MULTICAST_ADDR, (err) => {
        if (err) console.warn('[lanpm] UDP multicast send failed:', err.message)
      })
    }
  }

  private remember(peer: DiscoveryPayload): void {
    this.peers.set(peer.deviceId, { peer, updatedAt: Date.now() })
    rememberPeerGroups(peer.userId, peer.displayName, peer.groups)
    this.opts.onPeer(peer)
  }

  private prune(): void {
    const now = Date.now()
    for (const [id, entry] of this.peers) {
      if (now - entry.updatedAt > PEER_TTL_MS) this.peers.delete(id)
    }
  }
}
