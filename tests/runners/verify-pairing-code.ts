/**
 * SPRINT-PAIR-01 配对码全链路验收（TASK-PAIR-08）。
 * Run: npm run verify:pairing-code
 */
import { spawnNpmRun } from '../spawnNpm.ts'

const steps = [
  'verify:pairing-udp',
  'verify:pairing-tcp',
  'verify:pairing-cross-subnet',
  'verify:pairing-security',
  'verify:discover-relay',
  'verify:discover-seeds-restart',
  'verify:join-request',
  'verify:group-invite',
  'verify:discover'
] as const

for (const step of steps) {
  console.log(`\n=== verify:pairing-code / ${step} ===`)
  const result = spawnNpmRun(step)
  if (result.status !== 0) throw new Error(`verify:pairing-code failed at ${step}`)
}

console.log('\nverify:pairing-code: all passed')
