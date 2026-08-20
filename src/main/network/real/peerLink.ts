import net from 'node:net'
import type { DiscoverRelayPacket } from '../../../shared/discover/discoverRelay.ts'
import type { DiscoverableGroupAdvert } from '../../../shared/discover/types'
import type { DiscoveryPayload } from '../../../shared/network/types'
import type { SyncEnvelope } from '../../../shared/network/types'
import { HANDSHAKE_TIMEOUT_MS } from '../../../shared/network/constants.ts'
import type { PairingResolveFailReason } from '../../../shared/network/pairingTypes.ts'
import { PAIRING_RESOLVE_TIMEOUT_MS } from '../../../shared/network/pairingTypes.ts'
import {
  deriveAesKey,
  deriveSharedSecret,
  kdfSaltFromPairingCode,
  type DhKeyPair
} from '../../crypto/dhSession.ts'
import {
  acceptOrPinPeerPublicKey,
  PEER_PUBKEY_MISMATCH
} from '../../crypto/peerTrustStore.ts'
import { openEnvelope, openSealedBytes, sealEnvelope, sealEnvelopeParts } from '../../crypto/envelopeCrypto.ts'
import {
  createWireDecoder,
  encodeWire,
  shouldSendEnvelopeBin,
  type WireMessage,
  type WirePeerProfile
} from './wireProtocol.ts'

export type TcpPeerIdentity = WirePeerProfile & { host?: string }

export type PairingResolveResult =
  | { ok: true; profile: WirePeerProfile }
  | { ok: false; reason: PairingResolveFailReason }

export interface PeerLinkOptions {
  local: { deviceId: string; userId: string; displayName: string }
  listenPort: number
  getAdvertGroups: () => DiscoverableGroupAdvert[]
  keys: DhKeyPair
  onEnvelope: (envelope: SyncEnvelope) => void
  onPeerIdentified?: (peer: TcpPeerIdentity) => void
  onPeerAdvert?: (peer: TcpPeerIdentity) => void
  onReady?: (peer: TcpPeerIdentity) => void
  onClose: () => void
  onDiscoverRelay?: (packet: DiscoverRelayPacket, fromDeviceId: string) => void
  /** 服务端：校验 TCP pairing_resolve */
  resolvePairingCode?: (
    code: string,
    joinerDeviceId: string,
    joinerDisplayName: string
  ) => PairingResolveResult
}

type LinkState = 'idle' | 'handshaking' | 'ready' | 'closed'

function profileFromWire(msg: WirePeerProfile, host?: string): TcpPeerIdentity {
  return {
    deviceId: msg.deviceId,
    userId: msg.userId,
    displayName: msg.displayName,
    listenPort: msg.listenPort,
    groups: msg.groups,
    host
  }
}

export class PeerLink {
  private readonly opts: PeerLinkOptions
  private socket: net.Socket | null = null
  private aesKey: Buffer | null = null
  private state: LinkState = 'idle'
  private readonly decoder = createWireDecoder((msg) => this.handleWire(msg))
  private remoteDeviceId: string | null = null
  private remoteHost: string | undefined
  private remoteProfile: TcpPeerIdentity | null = null
  private isInitiator = false
  private readyNotified = false
  private connectCompletion: {
    resolve: () => void
    reject: (err: Error) => void
    timer: ReturnType<typeof setTimeout>
  } | null = null
  private awaitingPairingOk = false
  private pairingCode: string | null = null
  private peerEnvBin = false

  constructor(opts: PeerLinkOptions) {
    this.opts = opts
  }

  getRemoteDeviceId(): string | null {
    return this.remoteDeviceId
  }

  getRemoteProfile(): TcpPeerIdentity | null {
    return this.remoteProfile
  }

  attachIncoming(socket: net.Socket): void {
    if (this.state !== 'idle') {
      socket.destroy()
      return
    }
    this.socket = socket
    this.remoteHost = socket.remoteAddress ?? undefined
    this.isInitiator = false
    this.state = 'handshaking'
    socket.on('data', (chunk) => this.decoder.feed(chunk))
    socket.on('close', () => this.close())
    socket.on('error', () => this.close())
  }

  async connect(peer: DiscoveryPayload): Promise<void> {
    if (this.state !== 'idle') return
    this.isInitiator = true
    this.remoteDeviceId = peer.deviceId
    this.remoteHost = peer.host
    this.state = 'handshaking'

    await new Promise<void>((resolve, reject) => {
      this.armConnectCompletion(resolve, reject, 'handshake_timeout')
      const host = peer.host ?? '127.0.0.1'
      const socket = net.connect({ host, port: peer.listenPort }, () => {
        this.socket = socket
        this.sendWire(this.localHandshake())
      })
      socket.on('data', (chunk) => this.decoder.feed(chunk))
      socket.on('close', () => this.close())
      socket.on('error', (err) => {
        this.failConnect(err)
      })
    })
  }

  /** 连接指定 host（真网联调 / 跨子网手动节点） */
  async connectHost(host: string, port: number, peerHint?: Partial<DiscoveryPayload>): Promise<void> {
    if (this.state !== 'idle') return
    this.isInitiator = true
    this.remoteDeviceId = peerHint?.deviceId ?? null
    this.remoteHost = host
    this.state = 'handshaking'

    await new Promise<void>((resolve, reject) => {
      this.armConnectCompletion(resolve, reject, 'handshake_timeout')
      const socket = net.connect({ host, port }, () => {
        this.socket = socket
        this.sendWire(this.localHandshake())
      })
      socket.on('data', (chunk) => this.decoder.feed(chunk))
      socket.on('close', () => this.close())
      socket.on('error', (err) => {
        this.failConnect(err)
      })
    })
  }

  /**
   * 跨网段兜底：先 TCP pairing_resolve，再 DH 握手。
   */
  async connectHostWithPairing(
    host: string,
    port: number,
    pairing: { code: string; joinerDeviceId: string; joinerDisplayName: string }
  ): Promise<void> {
    if (this.state !== 'idle') return
    this.isInitiator = true
    this.remoteHost = host
    this.state = 'handshaking'
    this.awaitingPairingOk = true
    this.pairingCode = pairing.code

    await new Promise<void>((resolve, reject) => {
      this.armConnectCompletion(resolve, reject, 'pairing_resolve_timeout', PAIRING_RESOLVE_TIMEOUT_MS)

      const socket = net.connect({ host, port }, () => {
        this.socket = socket
        this.sendWire({
          kind: 'pairing_resolve',
          code: pairing.code,
          joinerDeviceId: pairing.joinerDeviceId,
          joinerDisplayName: pairing.joinerDisplayName
        })
      })
      socket.on('data', (chunk) => this.decoder.feed(chunk))
      socket.on('close', () => this.close())
      socket.on('error', (err) => {
        this.failConnect(err)
      })
    })
  }

  sendPeerAdvert(): void {
    if (this.state !== 'ready') return
    this.sendWire(this.localProfile())
  }

  sendDiscoverRelay(packet: DiscoverRelayPacket): void {
    if (this.state !== 'ready') return
    this.sendWire(packet)
  }

  send(envelope: SyncEnvelope): void {
    if (this.state !== 'ready' || !this.aesKey) return
    if (shouldSendEnvelopeBin(this.peerEnvBin, envelope.type)) {
      const { meta, ciphertext } = sealEnvelopeParts(this.aesKey, envelope)
      this.sendWire({ kind: 'envelope_bin', envelope: meta, ciphertext })
      return
    }
    const sealed = sealEnvelope(this.aesKey, envelope)
    this.sendWire({ kind: 'envelope', envelope: sealed })
  }

  close(): void {
    if (this.state === 'closed') return
    this.state = 'closed'
    this.clearConnectCompletion(new Error('link_closed'))
    this.socket?.destroy()
    this.socket = null
    this.aesKey = null
    this.opts.onClose()
  }

  isReady(): boolean {
    return this.state === 'ready'
  }

  private localProfile(): WirePeerProfile & { kind: 'peer_advert' } {
    return {
      kind: 'peer_advert',
      deviceId: this.opts.local.deviceId,
      userId: this.opts.local.userId,
      displayName: this.opts.local.displayName,
      listenPort: this.opts.listenPort,
      groups: this.opts.getAdvertGroups(),
      envBin: true
    }
  }

  private localHandshake(): WireMessage {
    const profile = this.localProfile()
    return {
      kind: 'handshake',
      publicKey: this.opts.keys.publicKey.toString('hex'),
      deviceId: profile.deviceId,
      userId: profile.userId,
      displayName: profile.displayName,
      listenPort: profile.listenPort,
      groups: profile.groups,
      envBin: profile.envBin
    }
  }

  private localHandshakeAck(): WireMessage {
    const profile = this.localProfile()
    return {
      kind: 'handshake_ack',
      publicKey: this.opts.keys.publicKey.toString('hex'),
      deviceId: profile.deviceId,
      userId: profile.userId,
      displayName: profile.displayName,
      listenPort: profile.listenPort,
      groups: profile.groups,
      envBin: profile.envBin
    }
  }

  private sendWire(msg: WireMessage): void {
    if (!this.socket || this.socket.destroyed) return
    this.socket.write(encodeWire(msg))
  }

  private rememberRemote(msg: WirePeerProfile): void {
    if (!msg.deviceId || !msg.userId) return
    this.remoteDeviceId = msg.deviceId
    const peer = profileFromWire(msg, this.remoteHost)
    this.remoteProfile = peer
    this.opts.onPeerIdentified?.(peer)
  }

  private notifyReady(): void {
    if (this.readyNotified || !this.remoteProfile) return
    this.readyNotified = true
    this.opts.onReady?.(this.remoteProfile)
    this.completeConnect()
  }

  private armConnectCompletion(
    resolve: () => void,
    reject: (err: Error) => void,
    timeoutCode: string,
    timeoutMs?: number
  ): void {
    const ms = timeoutMs ?? HANDSHAKE_TIMEOUT_MS
    const timer = setTimeout(() => {
      this.failConnect(new Error(timeoutCode))
    }, ms)
    this.connectCompletion = { resolve, reject, timer }
  }

  private completeConnect(): void {
    if (!this.connectCompletion) return
    clearTimeout(this.connectCompletion.timer)
    this.connectCompletion.resolve()
    this.connectCompletion = null
  }

  private failConnect(err: Error): void {
    this.clearConnectCompletion(err)
    if (this.state !== 'closed') {
      this.state = 'closed'
      this.socket?.destroy()
      this.socket = null
      this.opts.onClose()
    }
  }

  private clearConnectCompletion(err?: Error): void {
    if (!this.connectCompletion) return
    clearTimeout(this.connectCompletion.timer)
    if (err) {
      this.connectCompletion.reject(err)
    }
    this.connectCompletion = null
  }

  private handleWire(msg: WireMessage): void {
    if (this.state === 'closed') return

    if (msg.kind === 'pairing_resolve' && this.state === 'handshaking' && !this.isInitiator) {
      const resolver = this.opts.resolvePairingCode
      if (!resolver) {
        this.sendWire({ kind: 'pairing_resolve_fail', reason: 'expired' })
        return
      }
      const result = resolver(msg.code, msg.joinerDeviceId, msg.joinerDisplayName)
      if (result.ok) {
        this.pairingCode = msg.code
        this.sendWire({
          kind: 'pairing_resolve_ok',
          ...result.profile
        })
      } else {
        this.sendWire({ kind: 'pairing_resolve_fail', reason: result.reason })
      }
      return
    }

    if (msg.kind === 'pairing_resolve_ok' && this.isInitiator && this.awaitingPairingOk) {
      this.awaitingPairingOk = false
      this.rememberRemote(msg)
      this.sendWire(this.localHandshake())
      return
    }

    if (msg.kind === 'pairing_resolve_fail' && this.isInitiator && this.awaitingPairingOk) {
      this.awaitingPairingOk = false
      this.failConnect(new Error(`pairing_resolve_${msg.reason}`))
      return
    }

    if (msg.kind === 'handshake') {
      this.rememberRemote(msg)
      this.peerEnvBin = msg.envBin === true
      if (!this.isInitiator) {
        this.sendWire(this.localHandshakeAck())
      }
      this.finishHandshake(msg.publicKey)
      return
    }

    if (msg.kind === 'handshake_ack' && this.isInitiator) {
      this.rememberRemote(msg)
      this.peerEnvBin = msg.envBin === true
      this.finishHandshake(msg.publicKey)
      return
    }

    if (msg.kind === 'peer_advert' && this.state === 'ready') {
      this.rememberRemote(msg)
      if (this.remoteProfile) {
        this.opts.onPeerAdvert?.(this.remoteProfile)
      }
      return
    }

    if (msg.kind === 'discover_relay' && this.state === 'ready') {
      const fromId = this.remoteDeviceId ?? msg.viaDeviceId
      this.opts.onDiscoverRelay?.(msg, fromId)
      return
    }

    if (msg.kind === 'envelope' && this.state === 'ready' && this.aesKey) {
      try {
        const opened = openEnvelope(this.aesKey, msg.envelope)
        this.opts.onEnvelope(opened)
      } catch {
        console.warn('[peerLink] dropped unsealed or invalid envelope')
      }
      return
    }

    if (msg.kind === 'envelope_bin' && this.state === 'ready' && this.aesKey) {
      try {
        const opened = openSealedBytes(this.aesKey, msg.envelope, msg.ciphertext)
        this.opts.onEnvelope(opened)
      } catch {
        console.warn('[peerLink] dropped unsealed or invalid envelope_bin')
      }
    }
  }

  private finishHandshake(peerPublicHex: string): void {
    if (this.state === 'ready') return
    const deviceId = this.remoteDeviceId
    if (!deviceId) {
      this.failConnect(new Error('handshake_missing_device'))
      return
    }
    try {
      acceptOrPinPeerPublicKey(
        deviceId,
        peerPublicHex,
        this.pairingCode ? 'pairing' : 'tofu'
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : PEER_PUBKEY_MISMATCH
      this.failConnect(new Error(message))
      return
    }
    try {
      const peerPublic = Buffer.from(peerPublicHex, 'hex')
      const secret = deriveSharedSecret(this.opts.keys.privateKey, peerPublic)
      const salt = this.pairingCode ? kdfSaltFromPairingCode(this.pairingCode) : Buffer.alloc(0)
      this.aesKey = deriveAesKey(secret, salt)
    } catch {
      this.failConnect(new Error('handshake_dh_failed'))
      return
    }
    this.state = 'ready'
    this.notifyReady()
  }
}

export function createTcpServer(
  listenPort: number,
  onConnection: (socket: net.Socket) => void,
  onError?: (err: NodeJS.ErrnoException) => void
): net.Server {
  const server = net.createServer((socket) => onConnection(socket))
  server.on('error', (err: NodeJS.ErrnoException) => {
    onError?.(err)
  })
  server.listen({
    port: listenPort,
    host: '0.0.0.0',
    reuseAddress: true,
    exclusive: false
  })
  return server
}
