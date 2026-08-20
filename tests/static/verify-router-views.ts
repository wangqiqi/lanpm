/**
 * AUTO-08 — AppRouter 路由与视图组件；BottomNav 与 tabRules 视图集合一致。
 * Run: npm run verify:router-views
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { projectRoot } from '../projectRoot.ts'
import { isViewAllowedForGroup } from '../../src/shared/navigation/tabRules.ts'
import type { AppView } from '../../src/shared/navigation/types.ts'

const root = projectRoot

const routerSrc = readFileSync(join(root, 'src/renderer/src/app/AppRouter.tsx'), 'utf8')
const pathsSrc = readFileSync(join(root, 'src/renderer/src/routes/paths.ts'), 'utf8')

const routeViews = [...routerSrc.matchAll(/viewRoute\(\s*['"](\w+)['"]\s*\)/g)].map((m) => m[1]!)
const tabViews = [...pathsSrc.matchAll(/view:\s*['"](\w+)['"]/g)].map((m) => m[1]!)

const views = new Set([...routeViews, ...tabViews]) as Set<AppView>
const expected: AppView[] = ['chat', 'board', 'tree', 'gantt', 'calendar', 'whiteboard', 'files']
for (const v of expected) {
  assert.ok(views.has(v), `missing view in router/paths: ${v}`)
}

assert.ok(
  tabViews.join(',') === expected.join(','),
  `VIEW_TABS order must be ${expected.join(' → ')}, got ${tabViews.join(' → ')}`
)

assert.ok(existsSync(join(root, 'src/renderer/src/views/GroupView.tsx')), 'GroupView missing')
assert.ok(existsSync(join(root, 'src/renderer/src/views/CockpitView.tsx')), 'CockpitView missing')
assert.match(routerSrc, /CockpitView/, 'cockpit route missing')
assert.match(
  routerSrc,
  /lazy\(\(\) => import\('@renderer\/views\/CockpitView'\)\)/,
  'cockpit route must be lazy()'
)
assert.match(routerSrc, /<Suspense[\s\S]*CockpitView/, 'cockpit route must suspend')

for (const view of expected) {
  assert.equal(isViewAllowedForGroup('project', view), true, `project should allow ${view}`)
}
assert.equal(isViewAllowedForGroup('anonymous', 'chat'), true)
assert.equal(isViewAllowedForGroup('anonymous', 'board'), false)

console.log(`verify:router-views OK (${expected.length} views, tabRules aligned)`)
