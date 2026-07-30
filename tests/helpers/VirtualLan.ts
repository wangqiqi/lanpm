/**
 * In-process virtual LAN bus for multi-node UDP simulation (SPRINT-DISCOVER-TEST-02).
 * Used by integration tests — not loaded in production Electron main path.
 */
import { EventEmitter } from 'node:events'
import type dgram from 'node:dgram'
import { UDP_DISCOVERY_PORT, UDP_MULTICAST_ADDR } from '../../src/shared/network/constants.ts'

export type VirtualLanHandler = (
  buf: Buffer,
  rinfo: { address: string; port: number }
) => void

function parseIpv4(ip: string): [number, number, number, number] | null {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return null
  return parts as [number, number, number, number]
}

function subnetPrefix24(ip: string): string | null {
  const parts = parseIpv4(ip)
  if (!parts) return null
  return `${parts[0]}.${parts[1]}.${parts[2]}`
}

function isGlobalBroadcast(dest: string): boolean {
  return dest === '255.255.255.255'
}

function isSubnetBroadcast(dest: string): boolean {
  return dest.endsWith('.255') && !isGlobalBroadcast(dest)
}

function onSameSubnet24(a: string, b: string): boolean {
  const pa = subnetPrefix24(a)
  const pb = subnetPrefix24(b)
  return !!pa && pa === pb
}

function matchesSubnetBroadcast(nodeIp: string, broadcastDest: string): boolean {
  const prefix = subnetPrefix24(broadcastDest)
  if (!prefix) return false
  return nodeIp.startsWith(`${prefix}.`)
}

/** Central registry — routes unicast, subnet broadcast, global broadcast, and multicast. */
export class VirtualLanBus {
  private readonly nodes = new Map<string, VirtualLanHandler>()

  register(ip: string, handler: VirtualLanHandler): () => void {
    this.nodes.set(ip, handler)
    return () => {
      if (this.nodes.get(ip) === handler) this.nodes.delete(ip)
    }
  }

  listIps(): string[] {
    return [...this.nodes.keys()]
  }

  send(fromIp: string, buf: Buffer, destPort: number, destIp: string): void {
    if (destPort !== UDP_DISCOVERY_PORT) return

    const deliver = (toIp: string): void => {
      if (toIp === fromIp) return
      const handler = this.nodes.get(toIp)
      if (!handler) return
      handler(buf, { address: fromIp, port: UDP_DISCOVERY_PORT })
    }

    if (isGlobalBroadcast(destIp) || destIp === UDP_MULTICAST_ADDR) {
      for (const ip of this.nodes.keys()) deliver(ip)
      return
    }

    if (isSubnetBroadcast(destIp)) {
      for (const ip of this.nodes.keys()) {
        if (matchesSubnetBroadcast(ip, destIp)) deliver(ip)
      }
      return
    }

    deliver(destIp)
  }
}

type SocketEvents = {
  message: [buf: Buffer, rinfo: { address: string; port: number }]
  error: [err: Error]
  listening: []
  close: []
}

/** Minimal dgram.Socket subset for UdpDiscovery / PairingUdpController. */
export class VirtualUdpSocket extends EventEmitter {
  private readonly bus: VirtualLanBus
  private readonly localIp: string
  private unregister: (() => void) | null = null
  private bound = false
  private closed = false

  constructor(bus: VirtualLanBus, localIp: string) {
    super()
    this.bus = bus
    this.localIp = localIp
  }

  bind(port: number, addressOrCb?: string | (() => void), cb?: () => void): this {
    if (this.closed) return this
    const callback = typeof addressOrCb === 'function' ? addressOrCb : cb
    this.bound = true
    this.unregister = this.bus.register(this.localIp, (buf, rinfo) => {
      this.emit('message', buf, rinfo)
    })
    queueMicrotask(() => {
      this.emit('listening')
      callback?.()
    })
    return this
  }

  send(
    buf: Buffer,
    port: number,
    address: string,
    cb?: (err: Error | null) => void
  ): void {
    if (this.closed || !this.bound) {
      cb?.(new Error('virtual_udp_not_bound'))
      return
    }
    try {
      this.bus.send(this.localIp, buf, port, address)
      cb?.(null)
    } catch (err) {
      cb?.(err instanceof Error ? err : new Error(String(err)))
    }
  }

  setBroadcast(_flag: boolean): void {
    // no-op
  }

  addMembership(_addr: string): void {
    // no-op
  }

  close(): void {
    if (this.closed) return
    this.closed = true
    this.unregister?.()
    this.unregister = null
    this.emit('close')
  }

  override on<K extends keyof SocketEvents>(
    event: K,
    listener: (...args: SocketEvents[K]) => void
  ): this {
    return super.on(event, listener)
  }
}

export function createVirtualUdpSocket(bus: VirtualLanBus, localIp: string): dgram.Socket {
  return new VirtualUdpSocket(bus, localIp) as unknown as dgram.Socket
}

/** Fixture IPs: 10.0.{subnet}.10 — see plan DISCOVER-TEST-02 */
export function fixtureVirtualIp(subnet: number, host = 10): string {
  if (subnet < 0 || subnet > 255 || host < 1 || host > 254) {
    throw new Error('invalid_virtual_ip_fixture')
  }
  return `10.0.${subnet}.${host}`
}

export { onSameSubnet24, subnetPrefix24 }
