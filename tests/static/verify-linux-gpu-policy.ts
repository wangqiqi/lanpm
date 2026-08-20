/**
 * TASK-3203 — Linux GPU default-off + opt-in env name.
 * Run: npm run verify:linux-gpu-policy
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { projectRoot } from '../projectRoot.ts'

function read(rel: string): string {
  return readFileSync(join(projectRoot, rel), 'utf8')
}

const policy = read('src/shared/ops/linuxGpuPolicy.ts')
assert.match(policy, /export const LANPM_ENABLE_GPU_ENV = 'LANPM_ENABLE_GPU'/)
assert.match(policy, /shouldDisableLinuxGpu/)
assert.match(policy, /LINUX_DISABLE_GPU_SWITCHES/)

const main = read('src/main/index.ts')
assert.match(main, /shouldDisableLinuxGpu/)
assert.match(main, /LINUX_DISABLE_GPU_SWITCHES/)
assert.match(main, /disableHardwareAcceleration/)
assert.doesNotMatch(
  main.replace(/if \(shouldDisableLinuxGpu\(\)\) \{[\s\S]*?\n\}/, ''),
  /disableHardwareAcceleration/,
  'disableHardwareAcceleration must only run inside shouldDisableLinuxGpu()'
)

const smoke = read('tests/integration/electron-smoke-app.mjs')
assert.match(smoke, /disableHardwareAcceleration/)
assert.match(smoke, /disable-gpu/)

const pkg = JSON.parse(read('package.json')) as { scripts?: Record<string, string> }
assert.ok(pkg.scripts?.['verify:linux-gpu-policy'])

console.log('verify-linux-gpu-policy OK')
