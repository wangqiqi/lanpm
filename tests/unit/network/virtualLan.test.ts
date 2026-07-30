import { describe, expect, it } from 'vitest'
import { UDP_DISCOVERY_PORT } from '../../../src/shared/network/constants.ts'
import {
  VirtualLanBus,
  VirtualUdpSocket,
  createVirtualUdpSocket,
  fixtureVirtualIp,
  onSameSubnet24
} from '../../helpers/VirtualLan.ts'

describe('VirtualLanBus', () => {
  it('unicasts between two nodes', async () => {
    const bus = new VirtualLanBus()
    const a = fixtureVirtualIp(1, 10)
    const b = fixtureVirtualIp(1, 11)

    const received: string[] = []
    bus.register(b, (buf) => {
      received.push(buf.toString('utf8'))
    })

    const sock = new VirtualUdpSocket(bus, a)
    await new Promise<void>((resolve) => sock.bind(UDP_DISCOVERY_PORT, () => resolve()))
    sock.send(Buffer.from('hello'), UDP_DISCOVERY_PORT, b, () => undefined)

    expect(received).toEqual(['hello'])
    sock.close()
  })

  it('subnet broadcast reaches same /24 only', async () => {
    const bus = new VirtualLanBus()
    const a = fixtureVirtualIp(1, 10)
    const b = fixtureVirtualIp(1, 11)
    const c = fixtureVirtualIp(2, 10)

    const gotB: string[] = []
    const gotC: string[] = []
    bus.register(b, (buf) => gotB.push(buf.toString('utf8')))
    bus.register(c, (buf) => gotC.push(buf.toString('utf8')))

    const sock = new VirtualUdpSocket(bus, a)
    await new Promise<void>((resolve) => sock.bind(UDP_DISCOVERY_PORT, () => resolve()))
    sock.send(Buffer.from('bc'), UDP_DISCOVERY_PORT, '10.0.1.255', () => undefined)

    expect(gotB).toEqual(['bc'])
    expect(gotC).toEqual([])
    sock.close()
  })

  it('global broadcast reaches all registered nodes', async () => {
    const bus = new VirtualLanBus()
    const a = fixtureVirtualIp(1, 10)
    const b = fixtureVirtualIp(2, 10)

    const gotB: string[] = []
    bus.register(b, (buf) => gotB.push(buf.toString('utf8')))

    const sock = createVirtualUdpSocket(bus, a)
    await new Promise<void>((resolve) => sock.bind(UDP_DISCOVERY_PORT, () => resolve()))
    sock.send(Buffer.from('all'), UDP_DISCOVERY_PORT, '255.255.255.255', () => undefined)

    expect(gotB).toEqual(['all'])
    sock.close()
  })

  it('fixtureVirtualIp uses 10.0.{subnet}.{host}', () => {
    expect(fixtureVirtualIp(3, 10)).toBe('10.0.3.10')
    expect(onSameSubnet24('10.0.1.10', '10.0.1.99')).toBe(true)
    expect(onSameSubnet24('10.0.1.10', '10.0.2.10')).toBe(false)
  })

  it('drops all packets when udpDropRate is 1', async () => {
    const bus = new VirtualLanBus({ udpDropRate: 1 })
    const a = fixtureVirtualIp(1, 10)
    const b = fixtureVirtualIp(1, 11)
    const received: string[] = []
    bus.register(b, (buf) => received.push(buf.toString('utf8')))

    const sock = new VirtualUdpSocket(bus, a)
    await new Promise<void>((resolve) => sock.bind(UDP_DISCOVERY_PORT, () => resolve()))
    sock.send(Buffer.from('lost'), UDP_DISCOVERY_PORT, b, () => undefined)
    await new Promise((r) => setTimeout(r, 20))
    expect(received).toEqual([])
    sock.close()
  })

  it('delays packet delivery when udpDelayMs is set', async () => {
    const bus = new VirtualLanBus({ udpDelayMs: 40 })
    const a = fixtureVirtualIp(1, 10)
    const b = fixtureVirtualIp(1, 11)
    const received: string[] = []
    bus.register(b, (buf) => received.push(buf.toString('utf8')))

    const sock = new VirtualUdpSocket(bus, a)
    await new Promise<void>((resolve) => sock.bind(UDP_DISCOVERY_PORT, () => resolve()))
    sock.send(Buffer.from('late'), UDP_DISCOVERY_PORT, b, () => undefined)
    expect(received).toEqual([])
    await new Promise((r) => setTimeout(r, 55))
    expect(received).toEqual(['late'])
    sock.close()
  })
})
