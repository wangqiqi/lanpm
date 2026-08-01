export type GatewayConfig = {
  root: string
  host: string
  port: number
  token: string | null
  maxBytes: number
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): GatewayConfig {
  const host = env.LANPM_GATEWAY_HOST ?? '127.0.0.1'
  if (host !== '127.0.0.1' && host !== '::1' && host !== 'localhost') {
    throw new Error('SPIKE: only localhost bind allowed (127.0.0.1 | ::1 | localhost)')
  }
  const port = Number(env.LANPM_GATEWAY_PORT ?? '8787')
  const maxBytes = Number(env.LANPM_GATEWAY_MAX_BYTES ?? String(64 * 1024 * 1024))
  const tokenRaw = env.LANPM_GATEWAY_TOKEN?.trim()
  return {
    root: env.LANPM_GATEWAY_ROOT ?? './data',
    host,
    port: Number.isFinite(port) ? port : 8787,
    token: tokenRaw ? tokenRaw : null,
    maxBytes: Number.isFinite(maxBytes) ? maxBytes : 64 * 1024 * 1024
  }
}
