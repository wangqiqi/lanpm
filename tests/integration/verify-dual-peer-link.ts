/**
 * Live dual-machine TCP probe (not CI-default).
 *   LANPM_DUAL_PEER=192.168.20.12:43124 npm run verify:dual-peer-link
 * Proves: peer port open + optional local ESTAB (this Electron already connected).
 * Does not prove: UDP discover UI · encrypted chat · §6.2 files.
 */
import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'
import net from 'node:net'
import { parseHostPort } from '../../src/shared/network/manualPeer.ts'
import { DEFAULT_TCP_LISTEN_PORT } from '../../src/shared/network/constants.ts'
import { hasEstablishedTcpTo } from '../../src/shared/network/ssEstablished.ts'

const raw = (process.env.LANPM_DUAL_PEER ?? process.argv[2] ?? '').trim()

if (!raw) {
  if (process.env.CI === 'true' || process.env.CI === '1') {
    console.log('verify:dual-peer-link SKIP (CI, no LANPM_DUAL_PEER)')
    process.exit(0)
  }
  console.error(
    'verify:dual-peer-link — set peer host:port\n' +
      `  LANPM_DUAL_PEER=192.168.20.12:${DEFAULT_TCP_LISTEN_PORT} npm run verify:dual-peer-link`
  )
  process.exit(1)
}

const { host, port } = parseHostPort(raw.includes(':') ? raw : `${raw}:${DEFAULT_TCP_LISTEN_PORT}`)

await new Promise<void>((resolve, reject) => {
  const sock = net.connect({ host, port, timeout: 4000 }, () => {
    sock.end()
    resolve()
  })
  sock.on('error', reject)
  sock.on('timeout', () => {
    sock.destroy()
    reject(new Error('dual_peer_tcp_timeout'))
  })
})
console.log(`verify:dual-peer-link: listen ok ${host}:${port}`)

let table = ''
try {
  table = execSync('ss -tn', { encoding: 'utf8' })
} catch {
  try {
    table = execSync('netstat -tn', { encoding: 'utf8' })
  } catch {
    table = ''
  }
}

if (table) {
  const estab = hasEstablishedTcpTo(table, host, port)
  assert.ok(
    estab,
    `no ESTAB session to ${host}:${port} (port is open but this process is not the connected client)`
  )
  console.log(`verify:dual-peer-link: ESTAB to ${host}:${port}`)
} else {
  console.log('verify:dual-peer-link: ss/netstat unavailable; listen-only')
}

console.log('verify:dual-peer-link: ok (TCP only · not §6.2 chat/file)')
