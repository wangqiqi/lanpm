import type { Database } from 'better-sqlite3'
import type { NetworkTransport } from '../../../shared/network'
import { getSetupStatus } from '../../identity/setup'
import { NetworkStub } from './NetworkStub'

let transport: NetworkStub | null = null
let anonymousTransport: NetworkStub | null = null

function buildStub(deviceId: string, userId: string, displayName: string): NetworkStub {
  const stub = new NetworkStub({ deviceId, userId, displayName })
  stub.start()
  return stub
}

/** Anonymous stub for pre-setup LAN userId checks (M0-07). */
function ensureAnonymousStub(): NetworkStub {
  if (!anonymousTransport) {
    anonymousTransport = buildStub(
      `probe_${process.pid}`,
      '__lanpm_probe__',
      'LanPM Probe'
    )
  }
  return anonymousTransport
}

export function initNetworkStub(db: Database): NetworkTransport | null {
  const status = getSetupStatus(db)
  if (!status.configured || !status.user || !status.device) {
    ensureAnonymousStub()
    return null
  }

  if (transport) return transport

  transport = buildStub(status.device.deviceId, status.user.userId, status.user.displayName)
  return transport
}

export function refreshNetworkStubIdentity(db: Database): void {
  const status = getSetupStatus(db)
  if (!status.configured || !status.user || !status.device) return

  if (transport) {
    transport.stop()
    transport = null
  }

  transport = buildStub(status.device.deviceId, status.user.userId, status.user.displayName)
}

export function getNetworkTransport(): NetworkTransport | null {
  return transport
}

export function shutdownNetworkStub(): void {
  transport?.stop()
  transport = null
  anonymousTransport?.stop()
  anonymousTransport = null
}

export { getKnownLanUserIds } from './peerRegistry'
export { NetworkStub } from './NetworkStub'
