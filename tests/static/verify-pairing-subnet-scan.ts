/**
 * P2 网段扫描 + macOS 路由（SPRINT-PAIR-04）。
 * Run: npm run verify:pairing-subnet-scan
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'
import { listRouteGuidedSubnetPrefixes } from '../../src/shared/network/routeGuidedResolve.ts'
import {
  listSubnetScanHosts,
  SUBNET_SCAN_CONCURRENCY,
  SUBNET_SCAN_HOST_TIMEOUT_MS,
  SUBNET_SCAN_MAX_HOSTS
} from '../../src/shared/network/subnetScanHosts.ts'
import { parseMacOsNetstatRn } from '../../src/shared/network/routeTableParse.ts'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')

const pairingServiceSrc = readFileSync(
  join(projectRoot, 'src/main/discover/pairingService.ts'),
  'utf8'
)
const pairingUdpSrc = readFileSync(
  join(projectRoot, 'src/main/network/real/pairingUdp.ts'),
  'utf8'
)
const routeTableSrc = readFileSync(join(projectRoot, 'src/main/network/routeTable.ts'), 'utf8')
const pairingTypesSrc = readFileSync(join(projectRoot, 'src/shared/discover/pairing.ts'), 'utf8')
const pairingDoc = readFileSync(join(projectRoot, 'docs/02_技术实现建议.md'), 'utf8')

assert.match(pairingServiceSrc, /listSubnetScanHosts/)
assert.match(pairingServiceSrc, /subnetScanBatch/)
assert.match(pairingServiceSrc, /input\.subnetScan/)
assert.match(pairingUdpSrc, /lookupPairingCodeBatched/)
assert.match(routeTableSrc, /parseMacOsNetstatRn/)
assert.match(routeTableSrc, /darwin/)
assert.match(pairingTypesSrc, /subnetScan\?:/)

const prefixes = listRouteGuidedSubnetPrefixes({
  routeSubnetPrefixes: ['192.168.20', '192.168.30'],
  localLanIps: ['192.168.30.170'],
  seedHosts: []
})
assert.deepEqual(prefixes.sort(), ['192.168.20', '192.168.30'])

const scanHosts = listSubnetScanHosts(prefixes, {
  excludeHosts: ['192.168.30.170'],
  maxHosts: 8
})
assert.equal(scanHosts.length, 8)
assert.ok(!scanHosts.includes('192.168.30.170'))

assert.equal(SUBNET_SCAN_MAX_HOSTS, 512)
assert.equal(SUBNET_SCAN_CONCURRENCY, 32)
assert.equal(SUBNET_SCAN_HOST_TIMEOUT_MS, 800)

const macPrefixes = parseMacOsNetstatRn(`
Internet:
Destination        Gateway
192.168.20/24      link#6
192.168.30.0/24    link#7
`)
assert.deepEqual(macPrefixes.sort(), ['192.168.20', '192.168.30'])

assert.match(pairingDoc, /P2.*网段扫描|网段扫描.*P2/s)
assert.match(pairingDoc, /SPRINT-PAIR-04|macOS.*路由/s)

console.log('verify:pairing-subnet-scan OK')
