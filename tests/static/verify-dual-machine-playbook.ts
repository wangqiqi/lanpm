/**
 * 真网双机手验 playbook 静态守卫（§6 · TEST-TODO-12）。
 * 证明文档/UI/端口链可照做；不证明 CI 已跑双机。
 * Run: npm run verify:dual-machine-playbook
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
  typeof pkg.scripts['verify:dual-machine-playbook'],
  'string',
  'verify:dual-machine-playbook script'
)
assert.equal(typeof pkg.scripts['verify:m6'], 'string', 'verify:m6 script')
assert.equal(typeof pkg.scripts['verify:discover'], 'string', 'verify:discover script')

const constants = readFileSync(join(root, 'src/shared/network/constants.ts'), 'utf8')
assert.match(constants, /UDP_DISCOVERY_PORT = 43123/)
assert.match(constants, /DEFAULT_TCP_LISTEN_PORT = 43124/)

const docs05 = readFileSync(join(root, 'docs/05_测试与联调发布.md'), 'utf8')
assert.match(docs05, /### 6\.0 证据边界/, 'docs/05 §6.0 evidence boundary')
assert.match(docs05, /verify:m6/, 'docs/05 cites verify:m6 loopback')
assert.match(docs05, /verify:dual-machine-playbook/, 'docs/05 cites dual-machine playbook guard')
assert.match(docs05, /UDP `43123`/, 'docs/05 UDP port')
assert.match(docs05, /TCP `43124`/, 'docs/05 TCP port')
assert.match(docs05, /LANPM_DISCOVER_SEEDS/, 'docs/05 auto peer seeds env')
assert.equal(typeof pkg.scripts['dev:dual-peer'], 'string', 'dev:dual-peer script')
assert.equal(typeof pkg.scripts['verify:dual-peer-link'], 'string', 'verify:dual-peer-link live TCP probe')
assert.match(docs05, /verify:dual-peer-link/, 'docs/05 cites live dual-peer TCP probe')

const stepTable = docs05.slice(
  docs05.indexOf('### 6.2 步骤'),
  docs05.indexOf('### 6.3 通过标准')
)
const stepRows = stepTable.match(/^\| [1-8] \|/gm)
assert.ok(stepRows && stepRows.length === 8, '§6.2 has 8 hand-test steps')

assert.match(docs05, /discover-connect-peer-cta|无法发现.{0,2}连接对端/, '§6 manual peer via discover')

const topbar = readFileSync(join(root, 'src/renderer/src/layout/TopBar.tsx'), 'utf8')
const modal = readFileSync(join(root, 'src/renderer/src/features/discover/DiscoverModal.tsx'), 'utf8')
const manualPeer = readFileSync(
  join(root, 'src/renderer/src/features/network/ManualPeerModal.tsx'),
  'utf8'
)

assert.match(topbar, /data-testid="topbar-discover"/)
assert.match(topbar, /ManualPeerModal/)
assert.match(modal, /data-testid="discover-connect-peer-cta"/)
assert.match(modal, /discover\.tabGroups/)
assert.match(modal, /key: 'people'/)
assert.match(manualPeer, /topbar\.manualPeerPlaceholder/)
const zhCn = readFileSync(join(root, 'src/renderer/src/i18n/locales/zh-CN.ts'), 'utf8')
assert.match(zhCn, /topbar\.manualPeerPlaceholder.*43124/, 'zh-CN manual peer placeholder cites 43124')

const templatePaths = [
  join(root, '.cursor/templates/dual_machine_handtest_TEMPLATE.md'),
  join(root, '.cursorGrowth/archive/templates/dual_machine_handtest_TEMPLATE.md')
]
assert.ok(
  templatePaths.some((p) => existsSync(p)),
  'hand-test template exists (.cursor/templates or .cursorGrowth/archive/templates)'
)

const m6Runner = readFileSync(join(root, 'tests/integration/verify-m6.ts'), 'utf8')
assert.match(m6Runner, /UDP_DISCOVERY_PORT/, 'verify:m6 imports discovery port constant')

console.log('verify:dual-machine-playbook: ok')
