import net from 'node:net'
import type { DiscoveryPayload } from '../../../shared/network/types'
import type { SyncEnvelope } from '../../../shared/network/types'
import { deriveAesKey, deriveSharedSecret, generateDhKeyPair, type DhKeyPair } from '../../crypto/dhSession.ts'
import { openEnvelope, sealEnvelope } from '../../crypto/envelopeCrypto.ts'
import { createWireDecoder, encodeWire, type WireMessage } from './wireProtocol.ts'

export interface PeerLinkOptions {
  local: { deviceId: string; userId: string; displayName: string }
  keys: DhKeyPair
  onEnvelope: (envelope: SyncEnvelope) => void
  onClose: () => void
}

type LinkState = 'idle' | 'handshaking' | 'ready' | 'closed'

export class PeerLink {
  private readonly opts: PeerLinkOptions
  private socket: net.Socket | null = null
  private aesKey: Buffer | null = null
  private state: LinkState = 'idle'
  private readonly decoder = createWireDecoder((msg) => this.handleWire(msg))

  constructor(opts: PeerLinkOptions) {
    this.opts = opts
  }

  get deviceId(): string | null {
    return this.remoteDeviceId
  }

  private remoteDeviceId: string | null = null
  private isInitiator = false

  attachIncoming(socket: net.Socket): void {
    if (this.state !== 'idle') {
      socket.destroy()
      return
    }
    this.socket = socket
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
    this.state = 'handshaking'

    await new Promise<void>((resolve, reject) => {
      const host = peer.host ?? '127.0.0.1'
      const socket = net.connect({ host, port: peer.listenPort }, () => {
        this.socket = socket
        this.sendWire({
          kind: 'handshake',
          deviceId: this.opts.local.deviceId,
          userId: this.opts.local.userId,
          displayName: this.opts.local.displayName,
          publicKey: this.opts.keys.publicKey.toString('hex')
        })
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

  /** 连接指定 host（真网联调） */
  async connectHost(host: string, port: number, peerHint?: Partial<DiscoveryPayload>): Promise<void> {
    if (this.state !== 'idle') return
    this.isInitiator = true
    this.remoteDeviceId = peerHint?.deviceId ?? null
    this.state = 'handshaking'

    await new Promise<void>((resolve, reject) => {
      const socket = net.connect({ host, port }, () => {
        this.socket = socket
        this.sendWire({
          kind: 'handshake',
          deviceId: this.opts.local.deviceId,
          userId: this.opts.local.userId,
          displayName: this.opts.local.displayName,
          publicKey: this.opts.keys.publicKey.toString('hex')
        })
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

  private sendWire(msg: WireMessage): void {
    if (!this.socket || this.socket.destroyed) return
    this.socket.write(encodeWire(msg))
  }

  private handleWire(msg: WireMessage): void {
    if (this.state === 'closed') return

    if (msg.kind === 'handshake') {
      this.remoteDeviceId = msg.deviceId
      if (!this.isInitiator) {
        this.sendWire({
          kind: 'handshake_ack',
          publicKey: this.opts.keys.publicKey.toString('hex')
        })
      }
      this.finishHandshake(msg.publicKey)
      return
    }

    if (msg.kind === 'handshake_ack' && this.isInitiator) {
      this.finishHandshake(msg.publicKey)
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
