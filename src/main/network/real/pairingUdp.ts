import type dgram from 'node:dgram'
import {
  isPairingUdpPacket,
  normalizePairingCode,
  PAIRING_LOOKUP_TIMEOUT_MS,
  PAIRING_OFFER_INTERVAL_MS,
  type PairingFoundBody,
  type PairingLookupBody,
  type PairingUdpPacket
} from '../../../shared/network/pairingTypes.ts'
import { UDP_DISCOVERY_PORT, UDP_MULTICAST_ADDR } from '../../../shared/network/constants.ts'
import type { PairingSessionHost } from './pairingSession'

export interface PairingUdpIdentity {
  deviceId: string
  displayName: string
}

export class PairingUdpController {
  private offerTimer: ReturnType<typeof setInterval> | null = null
  private pendingLookup: {
    code: string
    resolve: (found: PairingFoundBody) => void
    reject: (err: Error) => void
    timer: ReturnType<typeof setTimeout>
  } | null = null
  private readonly getSocket: () => dgram.Socket | null
  private readonly disableMulticast: boolean
  private readonly host: PairingSessionHost | null
  private readonly identity: PairingUdpIdentity

  constructor(
    getSocket: () => dgram.Socket | null,
    disableMulticast: boolean,
    host: PairingSessionHost | null,
    identity: PairingUdpIdentity
  ) {
    this.getSocket = getSocket
    this.disableMulticast = disableMulticast
    this.host = host
    this.identity = identity
  }

  startOfferBroadcast(): void {
    this.stopOfferBroadcast()
    this.broadcastOffer()
    this.offerTimer = setInterval(() => this.broadcastOffer(), PAIRING_OFFER_INTERVAL_MS)
  }

  stopOfferBroadcast(): void {
    if (this.offerTimer) clearInterval(this.offerTimer)
    this.offerTimer = null
  }

  cancelPendingLookup(): void {
    if (!this.pendingLookup) return
    clearTimeout(this.pendingLookup.timer)
    this.pendingLookup.reject(new Error('pairing_lookup_cancelled'))
    this.pendingLookup = null
  }

  lookupPairingCode(
    code: string,
    options?: { unicastHost?: string; unicastHosts?: string[] }
  ): Promise<PairingFoundBody> {
    this.cancelPendingLookup()
    const normalized = normalizePairingCode(code)
    const payload: PairingLookupBody = {
      code: normalized,
      joinerDeviceId: this.identity.deviceId,
      joinerDisplayName: this.identity.displayName
    }
    const packet: PairingUdpPacket = { v: 1, kind: 'pairing_lookup', payload }

    const hosts =
      options?.unicastHosts && options.unicastHosts.length > 0
        ? options.unicastHosts
        : options?.unicastHost
          ? [options.unicastHost]
          : null

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingLookup = null
        reject(new Error('pairing_lookup_timeout'))
      }, PAIRING_LOOKUP_TIMEOUT_MS)

      this.pendingLookup = { code: normalized, resolve, reject, timer }

      if (hosts) {
        for (const host of hosts) {
          this.send(packet, host)
        }
      } else {
        this.broadcast(packet)
      }
    })
  }

  /** @returns true if packet consumed */
  handleMessage(buf: Buffer, rinfo: { address: string; port?: number }): boolean {
    let raw: unknown
    try {
      raw = JSON.parse(buf.toString('utf8'))
    } catch {
      return false
    }
    if (!isPairingUdpPacket(raw)) return false

    if (raw.kind === 'pairing_offer') {
      return true
    }

    if (raw.kind === 'pairing_lookup') {
      if (this.host) {
        const found = this.host.handleLookup(raw.payload)
        if (found) {
          const reply: PairingUdpPacket = { v: 1, kind: 'pairing_found', payload: found }
          this.send(reply, rinfo.address, rinfo.port ?? UDP_DISCOVERY_PORT)
        }
      }
      return true
    }

    if (raw.kind === 'pairing_found') {
      const pending = this.pendingLookup
      if (pending) {
        clearTimeout(pending.timer)
        this.pendingLookup = null
        pending.resolve({ ...raw.payload, host: raw.payload.host || rinfo.address })
      }
      return true
    }

    return false
  }

  private broadcastOffer(): void {
    if (!this.host?.isActive()) return
    const offer = this.host.buildOffer()
    if (!offer) return
    const packet: PairingUdpPacket = { v: 1, kind: 'pairing_offer', payload: offer }
    this.broadcast(packet)
  }

  private broadcast(packet: PairingUdpPacket): void {
    const socket = this.getSocket()
    if (!socket) return
    const buf = Buffer.from(JSON.stringify(packet), 'utf8')
    socket.send(buf, UDP_DISCOVERY_PORT, '255.255.255.255', () => undefined)
    if (!this.disableMulticast) {
      socket.send(buf, UDP_DISCOVERY_PORT, UDP_MULTICAST_ADDR, () => undefined)
    }
  }

  private send(packet: PairingUdpPacket, host: string, port: number = UDP_DISCOVERY_PORT): void {
    const socket = this.getSocket()
    if (!socket) return
    const buf = Buffer.from(JSON.stringify(packet), 'utf8')
    socket.send(buf, port, host, () => undefined)
  }
}
