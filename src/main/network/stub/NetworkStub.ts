import {
  appendFileSync,
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readSync,
  statSync,
  unlinkSync,
  writeFileSync
} from 'fs'
import type { DiscoveryPayload, NetworkTransport, SyncEnvelope } from '../../../shared/network'
import {
  STUB_BUS_DIR,
  STUB_BUS_FILE,
  STUB_DISCOVERY_INTERVAL_MS,
  STUB_LISTEN_PORT,
  STUB_PEERS_DIR
} from './constants.ts'
import { MessageDedup } from './dedup.ts'
import { LamportClock } from './lamport.ts'
import { readPeerRecords, refreshLanUserIds } from './peerRegistry.ts'

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
    this.discoveryTimer = setInterval(() => this.writePeerRecord(), STUB_DISCOVERY_INTERVAL_MS)
    this.pollTimer = setInterval(() => this.pollBus(), 200)
  }

  stop(): void {
    if (!this.started) return
    this.started = false
    if (this.discoveryTimer) clearInterval(this.discoveryTimer)
    if (this.pollTimer) clearInterval(this.pollTimer)
    this.discoveryTimer = null
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
      capabilities: this.capabilities
    }
    writeFileSync(this.peerFilePath, JSON.stringify(payload), 'utf8')
    const peers = readPeerRecords(this.deviceId)
    refreshLanUserIds(peers)
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
  }

  private deliver(envelope: SyncEnvelope): void {
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

  getLamportValue(): number {
    return this.lamport.peek()
  }
}
