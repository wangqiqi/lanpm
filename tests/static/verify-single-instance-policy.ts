/**
 * 单实例策略静态守卫（双机/部署：每台机器默认仅一个 LanPM）。
 * Run: npm run verify:single-instance-policy
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { projectRoot } from '../projectRoot.ts'

function read(rel: string): string {
  return readFileSync(join(projectRoot, rel), 'utf8')
}

const policy = read('src/shared/ops/singleInstancePolicy.ts')
assert.match(policy, /LANPM_ALLOW_MULTI_INSTANCE/)
assert.match(policy, /shouldAllowMultipleLanpmInstances/)

const main = read('src/main/index.ts')
assert.match(main, /shouldAllowMultipleLanpmInstances/)
assert.match(main, /acquireMachineSingletonLock/)
assert.match(main, /requestSingleInstanceLock/)
assert.doesNotMatch(
  main,
  /if \(!isolatedLaunch\)[\s\S]*requestSingleInstanceLock/,
  'single-instance must not be gated only on isolatedLaunch'
)

const docs = read('docs/05_测试与联调发布.md')
assert.match(docs, /单实例|一个.*LanPM/)

const pkg = JSON.parse(read('package.json')) as { scripts?: Record<string, string> }
assert.ok(pkg.scripts?.['verify:single-instance-policy'])
assert.ok(pkg.scripts?.['lanpm:stop'])

console.log('verify-single-instance-policy: ok')
