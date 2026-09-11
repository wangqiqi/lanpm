/**
 * 三平台 / 安装包冷启动手验 playbook 静态守卫（§5.1 · §1.4 · TEST-TODO-13）。
 * 证明文档 · dist 脚本 · Linux installer smoke 链可照做；不证明 Win/mac 已手测。
 * Run: npm run verify:platform-cold-start-playbook
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { projectRoot } from '../projectRoot.ts'

const root = projectRoot
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>
}

assert.equal(
  typeof pkg.scripts['verify:platform-cold-start-playbook'],
  'string',
  'verify:platform-cold-start-playbook script'
)
assert.equal(typeof pkg.scripts['verify:platform-matrix'], 'string', 'verify:platform-matrix script')
assert.equal(
  typeof pkg.scripts['verify:linux-installer-smoke'],
  'string',
  'verify:linux-installer-smoke script'
)
for (const key of ['dist:win', 'dist:mac', 'dist:linux:x64']) {
  assert.equal(typeof pkg.scripts[key], 'string', `missing ${key}`)
}

const docs05 = readFileSync(join(root, 'docs/05_测试与联调发布.md'), 'utf8')
assert.match(docs05, /### 5\.1 冷启动/, 'docs/05 §5.1 cold start')
assert.match(docs05, /verify:platform-cold-start-playbook/, 'docs/05 cites platform cold-start playbook')
assert.match(docs05, /verify:linux-installer-smoke/, 'docs/05 cites linux installer smoke')
assert.match(docs05, /verify:platform-matrix/, 'docs/05 cites platform matrix')
assert.match(docs05, /冷启动进入首次配置/, 'docs/05 UOS cold-start checklist item')
assert.match(docs05, /nav-tab-chat/, 'docs/05 linux smoke asserts chat tab')

const section51 = docs05.slice(
  docs05.indexOf('### 5.1 冷启动'),
  docs05.indexOf('### 5.2 内存')
)
assert.match(section51, /≤ 3s|3s/, '§5.1 states 3s cold-start budget')
assert.match(section51, /verify:linux-installer-smoke/, '§5.1 links linux installer smoke')

const uosBlock = docs05.slice(
  docs05.indexOf('#### 统信 UOS'),
  docs05.indexOf('---', docs05.indexOf('#### 统信 UOS') + 1)
)
const uosChecks = uosBlock.match(/^- \[ \]/gm)
assert.ok(uosChecks && uosChecks.length >= 6, '§1.4 UOS smoke has ≥6 checklist items')

const smoke = readFileSync(join(root, 'scripts/linux-installer-smoke.mjs'), 'utf8')
assert.match(smoke, /LANPM_REQUIRE_INSTALLER/, 'linux-installer-smoke gated by env')

const templatePath = join(
  root,
  '.cursorGrowth/archive/templates/platform_cold_start_handtest_TEMPLATE.md'
)
assert.ok(existsSync(templatePath), 'platform cold-start hand-test template exists')

console.log('verify:platform-cold-start-playbook: ok')
