import type { Database } from 'better-sqlite3'
import { throwLanpm } from '../../shared/errors/lanpmError'
import type { NetworkTransport } from '../../shared/network'
import type { NetworkMode, NetworkStatusView } from '../../shared/network/status'
import { initChatService } from '../chat/chatService'
import { listDiscoverableGroupsForAdvert } from '../group/groupService'
import { getSetupStatus } from '../identity/setup'
import { setDiscoverableGroupsProvider } from '../discover/advertProvider'
import { connectDiscoverSeeds, appendDiscoverSeeds, loadDiscoverSeeds } from '../discover/discoverService'
import { RealNetworkTransport } from './real/RealNetworkTransport'
import {
  initNetworkStub,
  getNetworkTransport as getStubTransport,
  refreshNetworkStubIdentity,
  shutdownNetworkStub,
  NetworkStub
} from './stub/index'
import { getKnownLanUserIds } from './peerDirectory'
import { getLocalLanIp } from './localIp'
import {
  DEFAULT_LANPM_TCP_PORT,
  resolveLanpmTcpPort
} from '../../shared/network/listenPort.ts'

export type { NetworkMode } from '../../shared/network/status'

let realTransport: RealNetworkTransport | null = null

function bindDiscoverableGroupsProvider(db: Database): void {
  setDiscoverableGroupsProvider(() => listDiscoverableGroupsForAdvert(db))
}

export function resolveNetworkMode(): NetworkMode {
  const env = process.env.LANPM_NETWORK?.toLowerCase()
  if (env === 'stub') return 'stub'
  if (env === 'real') return 'real'
  return 'real'
}

function buildReal(
  deviceId: string,
  userId: string,
  displayName: string,
  db?: Database
): RealNetworkTransport {
  const rawPort = process.env.LANPM_TCP_PORT
  const port = resolveLanpmTcpPort(rawPort)
  if (
    rawPort != null &&
    String(rawPort).trim() !== '' &&
    port === DEFAULT_LANPM_TCP_PORT &&
    Number(String(rawPort).trim()) !== DEFAULT_LANPM_TCP_PORT
  ) {
    console.warn(
      `[lanpm] invalid LANPM_TCP_PORT=${JSON.stringify(rawPort)}; using ${DEFAULT_LANPM_TCP_PORT}`
    )
  }
  const transport = new RealNetworkTransport({
    deviceId,
    userId,
    displayName,
    listenPort: port,
    disableUdp: process.env.LANPM_DISABLE_UDP === '1',
    getRelaySeeds: db ? () => loadDiscoverSeeds(db) : undefined,
    onRelaySeedsLearned: db
      ? (addresses) => {
          appendDiscoverSeeds(db, addresses)
        }
      : undefined
  })
  transport.start()
  return transport
}

export function initNetwork(db: Database): NetworkTransport | null {
  bindDiscoverableGroupsProvider(db)
  const mode = resolveNetworkMode()
  if (mode === 'stub') return initNetworkStub(db)

  const status = getSetupStatus(db)
  if (!status.configured || !status.user || !status.device) {
    initNetworkStub(db)
    return null
  }

  if (realTransport) return realTransport
  realTransport = buildReal(status.device.deviceId, status.user.userId, status.user.displayName, db)
  void connectDiscoverSeeds(db, { waitForGroups: true }).catch((err) => {
    console.warn('[lanpm] connectDiscoverSeeds failed:', err instanceof Error ? err.message : err)
  })
  return realTransport
}

export function refreshNetworkIdentity(db: Database): void {
  bindDiscoverableGroupsProvider(db)
  const mode = resolveNetworkMode()
  if (mode === 'stub') {
    refreshNetworkStubIdentity(db)
    return
  }

  const status = getSetupStatus(db)
  if (!status.configured || !status.user || !status.device) return

  realTransport?.stop()
  realTransport = null
  realTransport = buildReal(status.device.deviceId, status.user.userId, status.user.displayName, db)
  void connectDiscoverSeeds(db, { waitForGroups: true }).catch((err) => {
    console.warn('[lanpm] connectDiscoverSeeds failed:', err instanceof Error ? err.message : err)
  })
  initChatService(db)
}

export function getNetworkTransport(): NetworkTransport | null {
  if (resolveNetworkMode() === 'stub') return getStubTransport()
  return realTransport
}

export function shutdownNetwork(): void {
  realTransport?.stop()
  realTransport = null
  shutdownNetworkStub()
}

export async function fetchNetworkStatus(): Promise<NetworkStatusView> {
  const mode = resolveNetworkMode()
  const localIp = getLocalLanIp()
  const transport = getNetworkTransport()
  if (!transport) {
    return { mode, linkState: 'offline', peerCount: 0, localIp }
  }
  try {
    const peers = await transport.discoverPeers()
    const peerCount = peers.filter((p) => p.userId && p.userId !== '__lanpm_probe__').length
    if (mode === 'stub') {
      return { mode: 'stub', linkState: 'stub', peerCount, localIp }
    }
    return {
      mode: 'real',
      linkState: peerCount > 0 ? 'online' : 'offline',
      peerCount,
      localIp
    }
  } catch {
    return { mode, linkState: 'offline', peerCount: 0, localIp }
  }
}

export function reconnectNetwork(db: Database): void {
  refreshNetworkIdentity(db)
}

export async function connectManualPeer(host: string, port: number): Promise<void> {
  const transport = getNetworkTransport()
  if (!transport) throwLanpm('err.networkNotReady')

  if (transport instanceof RealNetworkTransport) {
    await transport.connectManualHost(host, port)
    return
  }
  if (transport instanceof NetworkStub) {
    transport.registerManualPeer(host, port)
    return
  }
  throwLanpm('err.manualPeerUnsupported')
}

export { getKnownLanUserIds, NetworkStub, RealNetworkTransport }
