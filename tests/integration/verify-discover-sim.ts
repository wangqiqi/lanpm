/**
 * VirtualLan 2-node：同子网 UDP 配对码全链 + UDP 自动发现。
 * Run: npm run verify:discover-sim
 */
import { runBasicTwoNodeSim } from './discover-sim/scenarios.ts'

await runBasicTwoNodeSim()
console.log('verify:discover-sim OK')
