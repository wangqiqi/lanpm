import type dgram from 'node:dgram'
import {
  isGroupInviteUdpPacket,
  normalizePairingCode,
  PAIRING_LOOKUP_TIMEOUT_MS,
  PAIRING_OFFER_INTERVAL_MS,
  type GroupInviteFoundBody,
  type GroupInviteLookupBody,
  type GroupInviteUdpPacket
} from '../../../shared/group/groupInvite.ts'
import { UDP_DISCOVERY_PORT, UDP_MULTICAST_ADDR } from '../../../shared/network/constants.ts'
import type { GroupInviteSessionHost } from './groupInviteSession.ts'

export interface GroupInviteUdpIdentity {
  deviceId: string
  displayName: string
}

export class GroupInviteUdpController {
  private offerTimer: ReturnType<typeof setInterval> | null = null
  private pendingLookup: {
    code: string
    resolve: (found: GroupInviteFoundBody) => void
    reject: (err: Error) => void
    timer: ReturnType<typeof setTimeout>
  } | null = null
  private readonly getSocket: () => dgram.Socket | null
  private readonly disableMulticast: boolean
  private readonly host: GroupInviteSessionHost | null
  private readonly identity: GroupInviteUdpIdentity

  constructor(
    getSocket: () => dgram.Socket | null,
    disableMulticast: boolean,
    host: GroupInviteSessionHost | null,
    identity: GroupInviteUdpIdentity
  ) {
    this.getSocket = getSocket
    this.disableMulticast = disableMulticast
    this.host = host
    this.identity = identity
  }

  startOfferBroadcast(): void {
    this.stopOfferBroadcast()
    this.broadcastOffers()
    this.offerTimer = setInterval(() => this.broadcastOffers(), PAIRING_OFFER_INTERVAL_MS)
  }

  stopOfferBroadcast(): void {
    if (this.offerTimer) clearInterval(this.offerTimer)
    this.offerTimer = null
  }

  cancelPendingLookup(): void {
    if (!this.pendingLookup) return
    clearTimeout(this.pendingLookup.timer)
    this.pendingLookup.reject(new Error('group_invite_lookup_cancelled'))
    this.pendingLookup = null
  }

  lookupGroupInviteCode(code: string, options?: { unicastHost?: string }): Promise<GroupInviteFoundBody> {
    this.cancelPendingLookup()
    const normalized = normalizePairingCode(code)
    const payload: GroupInviteLookupBody = {
      code: normalized,
      joinerDeviceId: this.identity.deviceId,
      joinerDisplayName: this.identity.displayName
    }
    const packet: GroupInviteUdpPacket = { v: 1, kind: 'group_invite_lookup', payload }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingLookup = null
        reject(new Error('group_invite_lookup_timeout'))
      }, PAIRING_LOOKUP_TIMEOUT_MS)

      this.pendingLookup = { code: normalized, resolve, reject, timer }

      if (options?.unicastHost) {
        this.send(packet, options.unicastHost)
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
    if (!isGroupInviteUdpPacket(raw)) return false

    if (raw.kind === 'group_invite_offer') {
      return true
    }

    if (raw.kind === 'group_invite_lookup') {
      if (this.host) {
        const found = this.host.handleLookup(raw.payload)
        if (found) {
          const reply: GroupInviteUdpPacket = { v: 1, kind: 'group_invite_found', payload: found }
          this.send(reply, rinfo.address, rinfo.port)
        }
      }
      return true
    }

    if (raw.kind === 'group_invite_found') {
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

  private broadcastOffers(): void {
    if (!this.host) return
    const offers = this.host.buildOffers()
    for (const offer of offers) {
      const packet: GroupInviteUdpPacket = { v: 1, kind: 'group_invite_offer', payload: offer }
      this.broadcast(packet)
    }
  }

  private broadcast(packet: GroupInviteUdpPacket): void {
    const socket = this.getSocket()
    if (!socket) return
    const buf = Buffer.from(JSON.stringify(packet), 'utf8')
    socket.send(buf, UDP_DISCOVERY_PORT, '255.255.255.255', () => undefined)
    if (!this.disableMulticast) {
      socket.send(buf, UDP_DISCOVERY_PORT, UDP_MULTICAST_ADDR, () => undefined)
    }
  }

  private send(packet: GroupInviteUdpPacket, host: string, port: number = UDP_DISCOVERY_PORT): void {
    const socket = this.getSocket()
    if (!socket) return
    const buf = Buffer.from(JSON.stringify(packet), 'utf8')
    socket.send(buf, port, host, () => undefined)
  }
}
