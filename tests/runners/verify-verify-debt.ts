/**
 * SPIKE-1310 verify-debt 聚合（7 脚本）。
 * Run: npm run verify:verify-debt
 */
import { spawnSync } from 'node:child_process'
import { projectRoot } from '../projectRoot.ts'

const scripts = [
  'verify:checklist',
  'verify:message-task',
  'verify:group-tag-dict',
  'verify:sync-outbox',
  'verify:task-crdt-store',
  'verify:task-crdt-realtime',
  'verify:task-crdt'
] as const

for (const script of scripts) {
  console.log(`\n=== ${script} ===`)
  const r = spawnSync('npm', ['run', script], {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env }
  })
  if (r.status !== 0) {
    console.error(`verify:verify-debt: ${script} failed`)
    process.exit(r.status ?? 1)
  }
}

console.log('\nverify:verify-debt: all passed')
