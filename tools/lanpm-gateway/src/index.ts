import { loadConfig } from './config.ts'
import { listenGateway } from './server.ts'

const config = loadConfig()
const gw = await listenGateway(config)
console.log(`lanpm-gateway listening on http://${config.host}:${config.port} root=${config.root}`)

function shutdown(): void {
  void gw.close().then(() => process.exit(0))
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
