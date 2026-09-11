/**
 * 插件离线分发 / 侧载 / 许可回归 playbook 静态守卫（TEST-TODO-16 · SPRINT-82）。
 * 登记既有 verify:plugin-* 链；不证明 IT 批量分发或应用商店已 CI 验完。
 * Run: npm run verify:plugin-distribution-playbook
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { projectRoot } from '../projectRoot.ts'

const root = projectRoot
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>
}

const PLUGIN_VERIFY_SCRIPTS = [
  'verify:plugin-spike',
  'verify:plugin-market-spike',
  'verify:offline-license-cli',
  'verify:plugin-loader',
  'verify:plugin-enable-ui',
  'verify:plugin-ui-surfaces',
  'verify:plugin-menus',
  'verify:contributions-views',
  'verify:plugin-distribution-playbook'
] as const

for (const key of PLUGIN_VERIFY_SCRIPTS) {
  assert.equal(typeof pkg.scripts[key], 'string', `missing package.json script ${key}`)
}

for (const key of PLUGIN_VERIFY_SCRIPTS) {
  const rel = pkg.scripts[key]!
  const tsName = rel.replace(/.*tests\/static\//, '').replace(/\.ts.*/, '.ts')
  if (!rel.includes('verify-plugin-distribution-playbook')) {
    const path = join(root, 'tests/static', tsName)
    assert.ok(existsSync(path), `missing runner file ${tsName}`)
  }
}

const docs05 = readFileSync(join(root, 'docs/05_测试与联调发布.md'), 'utf8')
assert.match(docs05, /#### 1\.2\.10 插件离线分发回归/, 'docs/05 §1.2.10 plugin section')
assert.match(docs05, /verify:plugin-distribution-playbook/, 'docs/05 cites plugin distribution playbook')
assert.match(docs05, /plugin_sideload_handtest_TEMPLATE/, 'docs/05 cites sideload hand-test template')

for (const key of PLUGIN_VERIFY_SCRIPTS) {
  if (key === 'verify:plugin-distribution-playbook') continue
  assert.match(docs05, new RegExp(key.replace(':', '\\:')), `docs/05 lists ${key}`)
}

const docs02 = readFileSync(join(root, 'docs/02_技术实现建议.md'), 'utf8')
assert.match(docs02, /verify:plugin-distribution-playbook/, 'docs/02 cites plugin distribution playbook')

const docs07 = readFileSync(join(root, 'docs/07_插件与扩展.md'), 'utf8')
assert.match(docs07, /verify:plugin-market-spike/, 'docs/07 cites plugin market spike guard')
assert.match(docs07, /verify:plugin-distribution-playbook/, 'docs/07 cites plugin distribution playbook')

const templatePath = join(
  root,
  '.cursorGrowth/archive/templates/plugin_sideload_handtest_TEMPLATE.md'
)
assert.ok(existsSync(templatePath), 'hand-test template exists in Growth archive/templates')

console.log('verify:plugin-distribution-playbook: ok')
