import { OPS_GATEWAY_DEFAULT_PORT, OPS_GATEWAY_HOST } from '../../shared/ops/gatewayTypes.ts'

export type GatewayConfig = {
  root: string
  host: string
  port: number
  token: string
  maxBytes: number
  terminalEnabled: boolean
}

export const GATEWAY_DEFAULT_MAX_BYTES = 64 * 1024 * 1024

export function assertLocalhostHost(host: string): void {
  if (host !== OPS_GATEWAY_HOST && host !== '::1' && host !== 'localhost') {
    throw new Error('Gateway only allows localhost bind (127.0.0.1)')
  }
}

export function normalizeGatewayConfig(input: {
  root: string
  port?: number
  token: string
  terminalEnabled?: boolean
  maxBytes?: number
}): GatewayConfig {
  const port = input.port ?? OPS_GATEWAY_DEFAULT_PORT
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    throw new Error('Invalid gateway port')
  }
  const token = input.token.trim()
  if (!token) {
    throw new Error('Gateway token required')
  }
  return {
    root: input.root,
    host: OPS_GATEWAY_HOST,
    port,
    token,
    maxBytes: input.maxBytes ?? GATEWAY_DEFAULT_MAX_BYTES,
    terminalEnabled: input.terminalEnabled ?? false
  }
}
