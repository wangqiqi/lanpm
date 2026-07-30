/**
 * CLI `lanpm pairing`（TASK-PAIR-22/23/24）。
 * Run: npm run verify:pairing-cli
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { createServer } from 'node:net'
import { fileURLToPath } from 'url'
import { setDiscoverableGroupsProvider } from '../../src/main/discover/advertProvider.ts'
import {
  parsePairingCliArgs,
  pairingCliHelp
} from '../../src/cli/pairingCliArgs.ts'
import { RealNetworkTransport } from '../../src/main/network/real/RealNetworkTransport.ts'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')
const pkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  bin?: Record<string, string>
}
const lanpmScript = readFileSync(join(projectRoot, 'scripts/lanpm.mjs'), 'utf8')
const cliMain = readFileSync(join(projectRoot, 'src/cli/main.ts'), 'utf8')

assert.ok(pkg.bin?.lanpm?.includes('lanpm.mjs'))
assert.match(lanpmScript, /src\/cli\/main\.ts/)
assert.match(cliMain, /pairingCli/)
assert.match(pairingCliHelp(), /pairing start/)

assert.deepEqual(parsePairingCliArgs(['pairing', 'start']), { command: 'start' })
assert.deepEqual(parsePairingCliArgs(['pairing', 'join', '847293', '--cross-subnet', '--host', '109']), {
  command: 'join',
  join: { code: '847293', crossSubnet: true, host: '109' }
})

function reservePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      if (!addr || typeof addr === 'string') {
        server.close()
        reject(new Error('failed to reserve port'))
        return
      }
      const port = addr.port
      server.close((err) => (err ? reject(err) : resolve(port)))
    })
  })
}

setDiscoverableGroupsProvider(() => [
  { groupId: 'cli-pair-group', name: 'CLI 配对群', type: 'project' }
])

const portA = await reservePort()
const portB = await reservePort()

const hostA = new RealNetworkTransport({
  deviceId: 'dev_cli_host',
  userId: 'user_cli_host',
  displayName: 'CLI Host',
  listenPort: portA,
  disableUdp: true
})
const hostB = new RealNetworkTransport({
  deviceId: 'dev_cli_joiner',
  userId: 'user_cli_joiner',
  displayName: 'CLI Joiner',
  listenPort: portB,
  disableUdp: true
})

hostA.start()
hostB.start()

const session = hostA.startPairingSession()

try {
  const peer = await hostB.joinWithPairingCode(session.code, {
    unicastHosts: ['127.0.0.1'],
    port: portA
  })
  assert.equal(peer.userId, 'user_cli_host')
  console.log('verify:pairing-cli OK')
} finally {
  hostA.stop()
  hostB.stop()
}
