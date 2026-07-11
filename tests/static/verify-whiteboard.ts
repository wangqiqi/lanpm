/**
 * TASK-229 — whiteboard wiring (nav · Excalidraw · IPC · export).
 * Run: npm run verify:whiteboard
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'
import type { AppView } from '../../src/shared/navigation/types.ts'
import { isViewAllowedForGroup } from '../../src/shared/navigation/tabRules.ts'
import { WHITEBOARD_IPC } from '../../src/shared/whiteboard/channels.ts'
import { whiteboardPathForTask } from '../../src/shared/whiteboard/paths.ts'
import { emptyWhiteboardSceneJson, normalizeSceneJson } from '../../src/shared/whiteboard/types.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

assert.equal(isViewAllowedForGroup('project', 'whiteboard'), true)
assert.equal(isViewAllowedForGroup('function', 'whiteboard'), false)

const pathsSrc = readFileSync(join(root, 'src/renderer/src/routes/paths.ts'), 'utf8')
const tabOrder = [...pathsSrc.matchAll(/view:\s*['"](\w+)['"]/g)].map((m) => m[1]!)
const expected: AppView[] = [
  'chat',
  'board',
  'tree',
  'gantt',
  'calendar',
  'whiteboard',
  'files'
]
assert.deepEqual(tabOrder, expected, 'VIEW_TABS must place whiteboard between calendar and files')

assert.equal(whiteboardPathForTask('g1', 't1'), '/g/g1/whiteboard?linkTask=t1')
assert.ok(normalizeSceneJson(emptyWhiteboardSceneJson()).includes('excalidraw'))

assert.equal(WHITEBOARD_IPC.getScene, 'whiteboard:getScene')
assert.equal(WHITEBOARD_IPC.saveScene, 'whiteboard:saveScene')
assert.equal(WHITEBOARD_IPC.exportPng, 'whiteboard:exportPng')

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  dependencies?: Record<string, string>
  scripts?: Record<string, string>
}
assert.ok(pkg.dependencies?.['@excalidraw/excalidraw'], 'missing @excalidraw/excalidraw')
assert.ok(pkg.scripts?.['verify:whiteboard'], 'missing verify:whiteboard script')

const viewPath = join(root, 'src/renderer/src/features/whiteboard/WhiteboardView.tsx')
assert.ok(existsSync(viewPath), 'WhiteboardView missing')
const viewSrc = readFileSync(viewPath, 'utf8')
assert.match(viewSrc, /@excalidraw\/excalidraw/)
assert.match(viewSrc, /exportToBlob/)
assert.match(viewSrc, /exportPng/)

const routerSrc = readFileSync(join(root, 'src/renderer/src/app/AppRouter.tsx'), 'utf8')
assert.match(routerSrc, /viewRoute\(\s*['"]whiteboard['"]\s*\)/)

const bottomNav = readFileSync(join(root, 'src/renderer/src/layout/BottomNav.tsx'), 'utf8')
assert.match(bottomNav, /whiteboard:/)

const ipcSrc = readFileSync(join(root, 'src/main/ipc/whiteboard.ts'), 'utf8')
assert.match(ipcSrc, /exportPng/)

console.log('verify:whiteboard OK (nav · Excalidraw · IPC · export)')
