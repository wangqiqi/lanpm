export type GatewayPaths = {
  root: string
  inboundDir: string
  outboundPaths: Record<string, string>
  maxBytes: number
}

export const DEFAULT_GATEWAY_PATHS: GatewayPaths = {
  root: './data',
  inboundDir: 'inbound',
  outboundPaths: {
    app: 'outbound/logs/app.log',
    nginx: 'outbound/logs/nginx.log'
  },
  maxBytes: 64 * 1024 * 1024
}
