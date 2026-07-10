/**
 * 纯 shared 冒烟脚本串联（无 Electron / SQLite）。
 * Run: npm run verify:shared
 */
import { spawnSync } from 'node:child_process'
import { projectRoot } from '../projectRoot.ts'

const steps = [
  'verify:suffix',
  'verify:preview-extensions',
  'verify:format-file-type',
  'verify:offline-sync',
  'verify:task-dep-protocol',
  'verify:network-manual',
  'verify:mentions',
  'verify:routes'
] as const

for (const step of steps) {
  console.log(`\n=== verify:shared / ${step} ===`)
  const result = spawnSync('npm', ['run', step], { cwd: projectRoot, stdio: 'inherit', shell: false })
  if (result.status !== 0) {
    throw new Error(`verify:shared failed at ${step}`)
  }
}

console.log('\nverify:shared: all passed')
