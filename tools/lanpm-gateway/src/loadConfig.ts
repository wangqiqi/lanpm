import type { GatewayConfig } from '../../../src/main/gateway/config.ts'
import { OPS_GATEWAY_DEFAULT_PORT, OPS_GATEWAY_HOST } from '../../../src/shared/ops/gatewayTypes.ts'

export function loadConfig(env: NodeJS.ProcessEnv = process.env): GatewayConfig {
  const host = env.LANPM_GATEWAY_HOST ?? OPS_GATEWAY_HOST
  if (host !== OPS_GATEWAY_HOST && host !== '::1' && host !== 'localhost') {
    throw new Error('SPIKE: only localhost bind allowed (127.0.0.1 | ::1 | localhost)')
  }
  const port = Number(env.LANPM_GATEWAY_PORT ?? String(OPS_GATEWAY_DEFAULT_PORT))
  const maxBytes = Number(env.LANPM_GATEWAY_MAX_BYTES ?? String(64 * 1024 * 1024))
  const tokenRaw = env.LANPM_GATEWAY_TOKEN?.trim()
  const token = tokenRaw || 'spike-dev-token'
  return {
    root: env.LANPM_GATEWAY_ROOT ?? './data',
    host: OPS_GATEWAY_HOST,
    port: Number.isFinite(port) ? port : OPS_GATEWAY_DEFAULT_PORT,
    token,
    maxBytes: Number.isFinite(maxBytes) ? maxBytes : 64 * 1024 * 1024,
    terminalEnabled: env.LANPM_GATEWAY_TERMINAL === '1'
  }
}
