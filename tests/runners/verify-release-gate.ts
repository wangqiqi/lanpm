/**
 * 发版前聚合门禁（文档 + 静态视觉 + 全量回归）。
 * Run: npm run verify:release-gate
 */
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { projectRoot } from '../projectRoot.ts'

const root = projectRoot

function run(cmd: string): void {
  const r = spawnSync(cmd, { shell: true, cwd: root, stdio: 'inherit', env: process.env })
  if (r.status !== 0) throw new Error(`verify:release-gate failed: ${cmd}`)
}

const steps = [
  'npm run verify:docs-code -- --strict',
  'npm run verify:visual',
  'npm run verify:profile-panel',
  'npm run verify:discover',
  'npm run verify:pairing-code',
  'npm run verify:project',
  'npm run verify:m7'
] as const

console.log('verify:release-gate: starting', `(v${JSON.parse(readFileSync(join(root, 'package.json'), 'utf8') as { version: string }).version})`)

for (const cmd of steps) {
  console.log(`\n=== verify:release-gate / ${cmd} ===`)
  run(cmd)
}

console.log('\nverify:release-gate: all passed')
