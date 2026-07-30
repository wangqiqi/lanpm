/**
 * VirtualLan 集成测试共享 fixture（SPRINT-DISCOVER-TEST-03）。
 */
import { createServer } from 'node:net'
import { setDiscoverableGroupsProvider } from '../../src/main/discover/advertProvider.ts'
import { RealNetworkTransport } from '../../src/main/network/real/RealNetworkTransport.ts'
import {
  VirtualLanBus,
  createVirtualUdpSocket,
  fixtureVirtualIp
} from './VirtualLan.ts'

export const SIM_GROUP_ID = 'discover-sim-group'

export function reservePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      if (!addr || typeof addr === 'string') {
        server.close()
        reject(new Error('failed to reserve port'))
        return
      }
      const port = addr.port
      server.close((err) => (err ? reject(err) : resolve(port)))
    })
  })
}

export function installSimGroupProvider(): void {
  setDiscoverableGroupsProvider(() => [
    { groupId: SIM_GROUP_ID, name: '仿真发现群', type: 'project' }
  ])
}

export interface SimHost {
  transport: RealNetworkTransport
  ip: string
  port: number
}

export async function createSimHost(
  bus: VirtualLanBus,
  subnet: number,
  hostOctet: number,
  identity: { deviceId: string; userId: string; displayName: string }
): Promise<SimHost> {
  const ip = fixtureVirtualIp(subnet, hostOctet)
  const port = await reservePort()
  const transport = new RealNetworkTransport({
    ...identity,
    listenPort: port,
    lanIp: ip,
    createUdpSocket: () => createVirtualUdpSocket(bus, ip)
  })
  return { transport, ip, port }
}

export async function stopSimHosts(hosts: SimHost[]): Promise<void> {
  for (const h of hosts) h.transport.stop()
}
