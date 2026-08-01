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
  typeof pkg.scripts['verify:e2e-views-expand'],
  'string',
  'verify:e2e-views-expand script'
)
assert.equal(
  typeof pkg.scripts['verify:ci-e2e-nightly'],
  'string',
  'verify:ci-e2e-nightly script'
)

const specPath = join(root, 'tests/e2e/views-tab-smoke.spec.ts')
const extendedSpecPath = join(root, 'tests/e2e/views-extended-tab-smoke.spec.ts')
const collabSpecPath = join(root, 'tests/e2e/collab-drawer-smoke.spec.ts')
const runnerPath = join(root, 'tests/runners/verify-e2e-views.ts')
const expandRunnerPath = join(root, 'tests/runners/verify-e2e-views-expand.ts')
const workflowPath = join(root, '.github/workflows/e2e-nightly.yml')

assert.ok(existsSync(specPath), 'views-tab-smoke.spec.ts exists')
assert.ok(existsSync(extendedSpecPath), 'views-extended-tab-smoke.spec.ts exists')
assert.ok(existsSync(collabSpecPath), 'collab-drawer-smoke.spec.ts exists')
assert.ok(existsSync(runnerPath), 'verify-e2e-views.ts runner exists')
assert.ok(existsSync(expandRunnerPath), 'verify-e2e-views-expand.ts runner exists')
assert.ok(existsSync(workflowPath), 'e2e-nightly.yml workflow exists')

const spec = readFileSync(specPath, 'utf8')
assert.match(spec, /openDemoProjectView/, 'spec uses openDemoProjectView')
assert.match(spec, /chat-island-surface/, 'spec asserts chat island')
assert.match(spec, /board-column-island/, 'spec asserts board island')
assert.match(spec, /tree-island-surface/, 'spec asserts tree island')

const setup = readFileSync(join(root, 'tests/e2e/fixtures/setup.ts'), 'utf8')
assert.match(setup, /openDemoProjectView/, 'setup exports openDemoProjectView')
assert.match(setup, /openCollaborationDrawer/, 'setup exports openCollaborationDrawer')
assert.match(setup, /demo-project/, 'setup references demo-project')

const extendedSpec = readFileSync(extendedSpecPath, 'utf8')
assert.match(extendedSpec, /gantt-island-surface/, 'extended spec asserts gantt')
assert.match(extendedSpec, /calendar-island-surface/, 'extended spec asserts calendar')

const collabSpec = readFileSync(collabSpecPath, 'utf8')
assert.match(collabSpec, /waitForCollabPanelReady/, 'collab spec waits for panel ready')
assert.match(collabSpec, /collab-open-files/, 'collab spec uses composer testid')

const chatView = readFileSync(join(root, 'src/renderer/src/features/chat/ChatView.tsx'), 'utf8')
assert.match(chatView, /data-testid="collab-open-files"/, 'ChatView collab files testid')

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
assert.match(docs05, /verify:e2e-views-expand/, 'docs/05 documents verify:e2e-views-expand')
assert.match(docs05, /e2e-nightly/, 'docs/05 documents e2e-nightly workflow')

console.log('verify:ci-e2e-nightly OK')
