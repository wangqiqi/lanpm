/**
 * VirtualLan 全矩阵仿真（SPRINT-DISCOVER-TEST-03）。
 * Run: npm run verify:discover-sim-full
 */
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { projectRoot } from '../projectRoot.ts'
import {
  runBasicTwoNodeSim,
  runCrossSubnetRouteGuidedSim,
  runCrossSubnetTailSim,
  runGroupInviteSim,
  runPeerFileSim,
  runSubnetScanSim,
  runThreeNodeRelaySim
} from '../integration/discover-sim/scenarios.ts'
import {
  runPairingRateLimitSim,
  runTcpOnlyFallbackSim,
  runUdpBlackholeSim
} from '../integration/discover-sim/fault-scenarios.ts'

const root = projectRoot

const scenarios: Array<[string, () => Promise<void>]> = [
  ['basic-two-node', runBasicTwoNodeSim],
  ['three-node-relay', runThreeNodeRelaySim],
  ['cross-subnet-route-guided', runCrossSubnetRouteGuidedSim],
  ['cross-subnet-tail', runCrossSubnetTailSim],
  ['subnet-scan', runSubnetScanSim],
  ['group-invite', runGroupInviteSim],
  ['peer-file', runPeerFileSim],
  ['tcp-only-fallback', runTcpOnlyFallbackSim],
  ['udp-blackhole', runUdpBlackholeSim],
  ['pairing-rate-limit', runPairingRateLimitSim]
]

for (const [name, fn] of scenarios) {
  console.log(`\n=== verify:discover-sim-full / ${name} ===`)
  await fn()
}

console.log('\n=== verify:discover-sim-full / pairing-service-db + join-request (electron node) ===')
const dbRun = spawnSync(
  'node',
  [
    join(root, 'scripts/run-electron-node.mjs'),
    '--experimental-strip-types',
    join(root, 'tests/integration/discover-sim/db-scenarios.ts')
  ],
  { cwd: root, stdio: 'inherit', env: process.env }
)
if (dbRun.status !== 0) {
  throw new Error('verify:discover-sim-full failed at db-scenarios')
}

console.log('\nverify:discover-sim-full: all passed')
