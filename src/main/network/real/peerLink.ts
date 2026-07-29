import net from 'node:net'
import type { DiscoverableGroupAdvert } from '../../../shared/discover/types'
import type { DiscoveryPayload } from '../../../shared/network/types'
import type { SyncEnvelope } from '../../../shared/network/types'
import { deriveAesKey, deriveSharedSecret, type DhKeyPair } from '../../crypto/dhSession.ts'
import { openEnvelope, sealEnvelope } from '../../crypto/envelopeCrypto.ts'
import {
  createWireDecoder,
  encodeWire,
  type WireMessage,
  type WirePeerProfile
} from './wireProtocol.ts'

export type TcpPeerIdentity = WirePeerProfile & { host?: string }

export interface PeerLinkOptions {
  local: { deviceId: string; userId: string; displayName: string }
  listenPort: number
  getAdvertGroups: () => DiscoverableGroupAdvert[]
  keys: DhKeyPair
  onEnvelope: (envelope: SyncEnvelope) => void
  onPeerIdentified?: (peer: TcpPeerIdentity) => void
  onReady?: (peer: TcpPeerIdentity) => void
  onClose: () => void
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
      const host = peer.host ?? '127.0.0.1'
      const socket = net.connect({ host, port: peer.listenPort }, () => {
        this.socket = socket
        this.sendWire(this.localHandshake())
        resolve()
      })
      socket.on('data', (chunk) => this.decoder.feed(chunk))
      socket.on('close', () => this.close())
      socket.on('error', (err) => {
        this.close()
        reject(err)
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
      const socket = net.connect({ host, port }, () => {
        this.socket = socket
        this.sendWire(this.localHandshake())
        resolve()
      })
      socket.on('data', (chunk) => this.decoder.feed(chunk))
      socket.on('close', () => this.close())
      socket.on('error', (err) => {
        this.close()
        reject(err)
      })
    })
  }

  sendPeerAdvert(): void {
    if (this.state !== 'ready') return
    this.sendWire(this.localProfile())
  }

  send(envelope: SyncEnvelope): void {
    if (this.state !== 'ready' || !this.aesKey) return
    const sealed = sealEnvelope(this.aesKey, envelope)
    this.sendWire({ kind: 'envelope', envelope: sealed })
  }

  close(): void {
    if (this.state === 'closed') return
    this.state = 'closed'
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
      groups: this.opts.getAdvertGroups()
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
      groups: profile.groups
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
      groups: profile.groups
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
  }

  private handleWire(msg: WireMessage): void {
    if (this.state === 'closed') return

    if (msg.kind === 'handshake') {
      this.rememberRemote(msg)
      if (!this.isInitiator) {
        this.sendWire(this.localHandshakeAck())
      }
      this.finishHandshake(msg.publicKey)
      return
    }

    if (msg.kind === 'handshake_ack' && this.isInitiator) {
      this.rememberRemote(msg)
      this.finishHandshake(msg.publicKey)
      return
    }

    if (msg.kind === 'peer_advert' && this.state === 'ready') {
      this.rememberRemote(msg)
      return
    }

    if (msg.kind === 'envelope' && this.state === 'ready' && this.aesKey) {
      try {
        const opened = openEnvelope(this.aesKey, msg.envelope)
        this.opts.onEnvelope(opened)
      } catch {
        // bad frame
      }
    }
  }

  private finishHandshake(peerPublicHex: string): void {
    if (this.state === 'ready') return
    const peerPublic = Buffer.from(peerPublicHex, 'hex')
    const secret = deriveSharedSecret(this.opts.keys.privateKey, peerPublic)
    this.aesKey = deriveAesKey(secret)
    this.state = 'ready'
    this.notifyReady()
  }
}

export function createTcpServer(
  listenPort: number,
  onConnection: (socket: net.Socket) => void
): net.Server {
  const server = net.createServer((socket) => onConnection(socket))
  server.listen(listenPort, '0.0.0.0')
  return server
}
