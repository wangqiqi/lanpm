/**
 * M1-01 / M1-03：七视图路由与群组 Tab 规则（无 UI）
 * SPRINT-14 TASK-1222：cockpit · mindmap 贡献路由
 * 运行：npm run verify:routes
 */
import assert from 'node:assert/strict'
import { isViewAllowedForGroup } from '../../src/shared/navigation/tabRules.ts'
import type { AppView } from '../../src/shared/navigation/types.ts'
import { isReservedContributionRoute } from '../../src/shared/plugin/contributions.ts'
import {
  cockpitPath,
  cockpitReturnPath,
  contributedViewPath,
  groupViewPath,
  isCoreAppView,
  parseGroupViewSegment
} from '../../src/renderer/src/routes/paths.ts'

const views: AppView[] = ['chat', 'board', 'tree', 'gantt', 'calendar', 'whiteboard', 'files']

const cases: [Parameters<typeof isViewAllowedForGroup>[0], AppView, boolean][] = [
  ['project', 'board', true],
  ['project', 'gantt', true],
  ['project', 'calendar', true],
  ['project', 'whiteboard', true],
  ['function', 'board', false],
  ['function', 'calendar', false],
  ['function', 'whiteboard', false],
  ['function', 'files', true],
  ['anonymous', 'chat', true],
  ['anonymous', 'files', false]
]

let failed = 0
for (const [type, view, expected] of cases) {
  const got = isViewAllowedForGroup(type, view)
  if (got !== expected) {
    console.error(`FAIL ${type}/${view}: expected ${expected}, got ${got}`)
    failed++
  }
}

const dmId = 'dm:demo-alice__demo-bob'
for (const view of views) {
  const expected = view === 'chat'
  const got = isViewAllowedForGroup('anonymous', view, dmId)
  if (got !== expected) {
    console.error(`FAIL dm/${view}: expected ${expected}, got ${got}`)
    failed++
  }
}

const groupId = 'demo-project'
assert.equal(cockpitPath(), '/cockpit')
assert.equal(groupViewPath(groupId, 'chat'), `/g/${groupId}/chat`)
assert.equal(contributedViewPath(groupId, 'mindmap'), `/g/${groupId}/mindmap`)
assert.equal(parseGroupViewSegment(`/g/${groupId}/mindmap`), 'mindmap')
assert.equal(isCoreAppView('mindmap'), false)
assert.equal(isCoreAppView('chat'), true)
assert.equal(isReservedContributionRoute('mindmap'), false)
assert.equal(isReservedContributionRoute('chat'), true)
assert.equal(
  cockpitReturnPath(groupId, `/g/${groupId}/board`, 'chat'),
  `/g/${groupId}/board`
)
assert.equal(cockpitReturnPath(groupId, `/g/other/board`, 'chat'), `/g/${groupId}/chat`)

const paths = views.map((v) => groupViewPath(groupId, v))
console.log('tabRules:', cases.length, 'cases OK')
console.log('core view paths:', paths.join(', '))
console.log('cockpit:', cockpitPath(), '· mindmap:', contributedViewPath(groupId, 'mindmap'))

if (failed > 0) process.exit(1)
console.log('verify:routes OK')
