/**
 * P0 一致性守卫串联。
 * Run: npm run verify:p0
 */
import { spawnNpmRun } from '../spawnNpm.ts'

const steps = [
  'verify:ipc-contract',
  'verify:i18n-keys',
  'verify:docs-links',
  'verify:rc-reality',
  'verify:router-views',
  'verify:stub-parity',
  'verify:stub-behavior',
  'verify:sync-handlers',
  'verify:schema-repo',
  'verify:schema-fk',
  'verify:task-store-patch',
  'verify:linux-gpu-policy',
  'verify:sec-hardening',
  'verify:storage-path-resolver',
  'verify:screenshots-layout',
  'verify:db-at-rest',
  'verify:office-preview',
  'verify:gantt-table-export',
  'verify:list-scroll-seed',
  'verify:list-scroll'
] as const

for (const step of steps) {
  console.log(`\n=== verify:p0 / ${step} ===`)
  const result = spawnNpmRun(step)
  if (result.status !== 0) throw new Error(`verify:p0 failed at ${step}`)
}

console.log('\nverify:p0: all passed')
