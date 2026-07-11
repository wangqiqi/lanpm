/**
 * M1-01 / M1-03：六视图路由与群组 Tab 规则（无 UI）
 * 运行：npm run verify:routes
 */
import { isViewAllowedForGroup } from '../../src/shared/navigation/tabRules.ts'
import type { AppView } from '../../src/shared/navigation/types.ts'

const views: AppView[] = ['chat', 'board', 'tree', 'gantt', 'calendar', 'files']

const cases: [Parameters<typeof isViewAllowedForGroup>[0], AppView, boolean][] = [
  ['project', 'board', true],
  ['project', 'gantt', true],
  ['project', 'calendar', true],
  ['function', 'board', false],
  ['function', 'calendar', false],
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

const paths = views.map((v) => `/g/demo-project/${v}`)
console.log('tabRules:', cases.length, 'cases OK')
console.log('view paths:', paths.join(', '))

if (failed > 0) process.exit(1)
console.log('verify:routes OK')
