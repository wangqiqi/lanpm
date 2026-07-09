/**
 * P0 一致性守卫串联。
 * Run: npm run verify:p0
 */
import { spawnSync } from 'node:child_process'
import { projectRoot } from '../projectRoot.ts'

const steps = [
  'verify:ipc-contract',
  'verify:i18n-keys',
  'verify:docs-links',
  'verify:rc-reality',
  'verify:router-views',
  'verify:stub-parity',
  'verify:sync-handlers',
  'verify:schema-repo',
  'verify:schema-fk',
  'verify:sec-hardening'
] as const

for (const step of steps) {
  console.log(`\n=== verify:p0 / ${step} ===`)
  const result = spawnSync('npm', ['run', step], { cwd: projectRoot, stdio: 'inherit', shell: false })
  if (result.status !== 0) throw new Error(`verify:p0 failed at ${step}`)
}

console.log('\nverify:p0: all passed')
