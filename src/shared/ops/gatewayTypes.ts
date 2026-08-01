export const OPS_GATEWAY_HOST = '127.0.0.1' as const

export const OPS_GATEWAY_DEFAULT_PORT = 8787

export type OpsGatewayConfig = {
  port: number
  token: string
  root: string
  terminalEnabled: boolean
}

export type OpsGatewayStatus = {
  running: boolean
  host: typeof OPS_GATEWAY_HOST
  port: number
  url: string | null
  token: string
  root: string
  terminalEnabled: boolean
  lastError?: string
}

export type OpsGatewayConfigPatch = Partial<
  Pick<OpsGatewayConfig, 'port' | 'root' | 'terminalEnabled'>
>
