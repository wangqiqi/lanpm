import { randomUUID } from 'node:crypto'
import type { Server } from 'node:http'
import type { GatewayConfig } from '../gateway/config.ts'
import { listenGateway, type GatewayServer } from '../gateway/httpServer.ts'
import type { OpsGatewayConfig, OpsGatewayStatus } from '../../shared/ops/gatewayTypes.ts'
import { OPS_GATEWAY_HOST } from '../../shared/ops/gatewayTypes.ts'
import { normalizeGatewayConfig } from '../gateway/config.ts'
import {
  getOpsGatewayConfig,
  rotateOpsGatewayToken,
  updateOpsGatewayConfig
} from './gatewayConfigStore.ts'
import type { OpsGatewayConfigPatch } from '../../shared/ops/gatewayTypes.ts'

let active: GatewayServer | null = null
let lastError: string | undefined

function toRuntimeConfig(config: OpsGatewayConfig): GatewayConfig {
  return normalizeGatewayConfig({
    root: config.root,
    port: config.port,
    token: config.token,
    terminalEnabled: config.terminalEnabled
  })
}

function buildStatus(config: OpsGatewayConfig): OpsGatewayStatus {
  const running = active != null
  return {
    running,
    host: OPS_GATEWAY_HOST,
    port: config.port,
    url: running ? `http://${OPS_GATEWAY_HOST}:${config.port}` : null,
    token: config.token,
    root: config.root,
    terminalEnabled: config.terminalEnabled,
    lastError
  }
}

export function getGatewayStatus(): OpsGatewayStatus {
  return buildStatus(getOpsGatewayConfig())
}

export function patchGatewayConfig(patch: OpsGatewayConfigPatch): OpsGatewayStatus {
  if (active) {
    throw new Error('gateway_running')
  }
  const config = updateOpsGatewayConfig(patch)
  return buildStatus(config)
}

export function rotateGatewayToken(): OpsGatewayStatus {
  if (active) {
    throw new Error('gateway_running')
  }
  const config = rotateOpsGatewayToken()
  return buildStatus(config)
}

export async function startGateway(): Promise<OpsGatewayStatus> {
  if (active) {
    return buildStatus(getOpsGatewayConfig())
  }
  lastError = undefined
  const config = getOpsGatewayConfig()
  try {
    const runtime = toRuntimeConfig(config)
    active = await listenGateway(runtime)
    return buildStatus(config)
  } catch (err) {
    active = null
    lastError = err instanceof Error ? err.message : 'start_failed'
    throw err
  }
}

export async function stopGateway(): Promise<OpsGatewayStatus> {
  if (!active) {
    return buildStatus(getOpsGatewayConfig())
  }
  const gw = active
  active = null
  lastError = undefined
  await gw.close()
  return buildStatus(getOpsGatewayConfig())
}

export async function shutdownGateway(): Promise<void> {
  await stopGateway()
}

export function gatewayHttpServer(): Server | null {
  return active?.server ?? null
}

export function newGatewaySessionId(): string {
  return randomUUID()
}
