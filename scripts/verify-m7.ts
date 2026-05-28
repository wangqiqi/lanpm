/**
 * M7 全量回归：验收映射 + 稳定性 + 性能 + M0–M6 串联。
 * Run: npm run verify:m7
 */
import { spawnSync } from 'node:child_process'

const steps: { name: string; cmd: string; env?: Record<string, string> }[] = [
  { name: 'typecheck', cmd: 'npm run typecheck' },
  { name: 'm7-acceptance', cmd: 'npm run verify:m7-acceptance' },
  { name: 'm7-stability', cmd: 'npm run verify:m7-stability' },
  { name: 'm7-perf', cmd: 'npm run verify:m7-perf' },
  { name: 'm0', cmd: 'npm run verify:m0', env: { LANPM_NETWORK: 'stub' } },
  { name: 'm1', cmd: 'npm run verify:m1' },
  { name: 'm2', cmd: 'npm run verify:m2', env: { LANPM_NETWORK: 'stub' } },
  { name: 'm3', cmd: 'npm run verify:m3' },
  { name: 'm4', cmd: 'npm run verify:m4' },
  { name: 'm5', cmd: 'npm run verify:m5' },
  { name: 'm6', cmd: 'npm run verify:m6' }
]

function runStep(name: string, cmd: string, env?: Record<string, string>): void {
  console.log(`\n=== verify:m7 / ${name} ===`)
  const result = spawnSync(cmd, {
    shell: true,
    stdio: 'inherit',
    env: { ...process.env, ...env },
    cwd: process.cwd()
  })
  if (result.status !== 0) {
    throw new Error(`step failed: ${name}`)
  }
}

console.log('verify:m7: starting full regression')

for (const step of steps) {
  runStep(step.name, step.cmd, step.env)
}

console.log('\nverify-m7: all steps passed')
