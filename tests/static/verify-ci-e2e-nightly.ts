/**
 * ci-e2e-nightly Sprint 静态门禁（脚本 · spec · workflow · BottomNav testid）。
 * Run: npm run verify:ci-e2e-nightly
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { projectRoot } from '../projectRoot.ts'

const root = projectRoot
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>
}

assert.equal(typeof pkg.scripts['verify:e2e-views'], 'string', 'verify:e2e-views script')
assert.equal(
  typeof pkg.scripts['verify:ci-e2e-nightly'],
  'string',
  'verify:ci-e2e-nightly script'
)

const specPath = join(root, 'tests/e2e/views-tab-smoke.spec.ts')
const runnerPath = join(root, 'tests/runners/verify-e2e-views.ts')
const workflowPath = join(root, '.github/workflows/e2e-nightly.yml')

assert.ok(existsSync(specPath), 'views-tab-smoke.spec.ts exists')
assert.ok(existsSync(runnerPath), 'verify-e2e-views.ts runner exists')
assert.ok(existsSync(workflowPath), 'e2e-nightly.yml workflow exists')

const spec = readFileSync(specPath, 'utf8')
assert.match(spec, /openDemoProjectView/, 'spec uses openDemoProjectView')
assert.match(spec, /chat-island-surface/, 'spec asserts chat island')
assert.match(spec, /board-column-island/, 'spec asserts board island')
assert.match(spec, /tree-island-surface/, 'spec asserts tree island')

const setup = readFileSync(join(root, 'tests/e2e/fixtures/setup.ts'), 'utf8')
assert.match(setup, /openDemoProjectView/, 'setup exports openDemoProjectView')
assert.match(setup, /demo-project/, 'setup references demo-project')

const bottomNav = readFileSync(join(root, 'src/renderer/src/layout/BottomNav.tsx'), 'utf8')
assert.match(bottomNav, /data-testid=\{`nav-tab-\$\{tab\.view\}`\}/, 'BottomNav nav-tab testids')

const workflow = readFileSync(workflowPath, 'utf8')
assert.match(workflow, /workflow_dispatch/, 'nightly workflow_dispatch')
assert.match(workflow, /schedule:/, 'nightly schedule')
assert.match(workflow, /xvfb-run/, 'nightly uses xvfb-run')
assert.match(workflow, /verify:e2e-discover/, 'nightly runs verify:e2e-discover')
assert.match(workflow, /verify:e2e-views/, 'nightly runs verify:e2e-views')

const docs05 = readFileSync(join(root, 'docs/05_测试与联调发布.md'), 'utf8')
assert.match(docs05, /verify:e2e-views/, 'docs/05 documents verify:e2e-views')
assert.match(docs05, /e2e-nightly/, 'docs/05 documents e2e-nightly workflow')

console.log('verify:ci-e2e-nightly OK')
