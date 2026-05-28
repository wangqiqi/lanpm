import type { Database } from 'better-sqlite3'
import type { NetworkTransport } from '../../shared/network'
import { initChatService } from '../chat/chatService'
import { getSetupStatus } from '../identity/setup'
import { RealNetworkTransport } from './real/RealNetworkTransport'
import {
  initNetworkStub,
  getNetworkTransport as getStubTransport,
  refreshNetworkStubIdentity,
  shutdownNetworkStub,
  NetworkStub
} from './stub/index'
import { getKnownLanUserIds } from './peerDirectory'

export type NetworkMode = 'stub' | 'real'

let realTransport: RealNetworkTransport | null = null

export function resolveNetworkMode(): NetworkMode {
  const env = process.env.LANPM_NETWORK?.toLowerCase()
  if (env === 'stub') return 'stub'
  if (env === 'real') return 'real'
  return 'real'
}

function buildReal(deviceId: string, userId: string, displayName: string): RealNetworkTransport {
  const port = Number(process.env.LANPM_TCP_PORT) || 43_124
  const transport = new RealNetworkTransport({
    deviceId,
    userId,
    displayName,
    listenPort: port,
    disableUdp: process.env.LANPM_DISABLE_UDP === '1'
  })
  transport.start()
  return transport
}

export function initNetwork(db: Database): NetworkTransport | null {
  const mode = resolveNetworkMode()
  if (mode === 'stub') return initNetworkStub(db)

  const status = getSetupStatus(db)
  if (!status.configured || !status.user || !status.device) {
    initNetworkStub(db)
    return null
  }

  if (realTransport) return realTransport
  realTransport = buildReal(status.device.deviceId, status.user.userId, status.user.displayName)
  return realTransport
}

export function refreshNetworkIdentity(db: Database): void {
  const mode = resolveNetworkMode()
  if (mode === 'stub') {
    refreshNetworkStubIdentity(db)
    return
  }

  const status = getSetupStatus(db)
  if (!status.configured || !status.user || !status.device) return

  realTransport?.stop()
  realTransport = null
  realTransport = buildReal(status.device.deviceId, status.user.userId, status.user.displayName)
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

export { getKnownLanUserIds, NetworkStub, RealNetworkTransport }
