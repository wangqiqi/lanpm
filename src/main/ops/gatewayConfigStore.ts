import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'
import {
  OPS_GATEWAY_DEFAULT_PORT,
  type OpsGatewayConfig,
  type OpsGatewayConfigPatch
} from '../../shared/ops/gatewayTypes.ts'
import { DEFAULT_GATEWAY_PATHS } from '../../shared/ops/paths.ts'

type StoreFile = OpsGatewayConfig

function storePath(): string {
  return join(app.getPath('userData'), 'ops-gateway-config.json')
}

function defaultRoot(): string {
  return join(app.getPath('userData'), 'ops-gateway-data')
}

export function generateGatewayToken(): string {
  return randomBytes(24).toString('hex')
}

function readStore(): StoreFile {
  const path = storePath()
  if (!existsSync(path)) {
    return {
      port: OPS_GATEWAY_DEFAULT_PORT,
      token: generateGatewayToken(),
      root: defaultRoot(),
      terminalEnabled: false
    }
  }
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as Partial<StoreFile>
    return {
      port:
        typeof raw.port === 'number' && raw.port >= 1 && raw.port <= 65535
          ? raw.port
          : OPS_GATEWAY_DEFAULT_PORT,
      token: typeof raw.token === 'string' && raw.token.trim() ? raw.token.trim() : generateGatewayToken(),
      root: typeof raw.root === 'string' && raw.root.trim() ? raw.root.trim() : defaultRoot(),
      terminalEnabled: raw.terminalEnabled === true
    }
  } catch {
    return {
      port: OPS_GATEWAY_DEFAULT_PORT,
      token: generateGatewayToken(),
      root: defaultRoot(),
      terminalEnabled: false
    }
  }
}

function writeStore(data: StoreFile): void {
  const path = storePath()
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf8')
}

export function getOpsGatewayConfig(): OpsGatewayConfig {
  return readStore()
}

export function updateOpsGatewayConfig(patch: OpsGatewayConfigPatch): OpsGatewayConfig {
  const current = readStore()
  const next: OpsGatewayConfig = {
    port: patch.port ?? current.port,
    token: current.token,
    root: patch.root ?? current.root,
    terminalEnabled: patch.terminalEnabled ?? current.terminalEnabled
  }
  if (!Number.isFinite(next.port) || next.port < 1 || next.port > 65535) {
    throw new Error('Invalid gateway port')
  }
  mkdirSync(next.root, { recursive: true })
  mkdirSync(join(next.root, DEFAULT_GATEWAY_PATHS.inboundDir), { recursive: true })
  writeStore(next)
  return next
}

export function rotateOpsGatewayToken(): OpsGatewayConfig {
  const current = readStore()
  const next = { ...current, token: generateGatewayToken() }
  writeStore(next)
  return next
}
