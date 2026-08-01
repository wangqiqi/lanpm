/**
 * TASK-1227 — Core views perf smoke (static guards for board/gantt/tree/whiteboard).
 * Run: npm run verify:core-views-perf
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readSrc(rel: string): string {
  const abs = join(root, rel)
  assert.ok(existsSync(abs), `missing ${rel}`)
  return readFileSync(abs, 'utf8')
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:core-views-perf'], 'missing verify:core-views-perf script')

// --- Route-level code splitting (heavy views) ---
const groupView = readSrc('src/renderer/src/views/GroupView.tsx')
assert.match(groupView, /lazy\(\(\) => import\('@renderer\/features\/gantt\/GanttView'\)\)/)
assert.match(groupView, /lazy\(\(\) => import\('@renderer\/features\/whiteboard\/WhiteboardView'\)\)/)
assert.match(groupView, /<Suspense[\s\S]*HeavyViewFallback/, 'GroupView must suspend heavy views')

// --- Board: column bucketing must be memoized ---
const boardView = readSrc('src/renderer/src/features/board/BoardView.tsx')
assert.match(boardView, /const tasksByColumn = useMemo/, 'BoardView must memoize column buckets')
assert.match(boardView, /const relationMap = useMemo/, 'BoardView must memoize relation map')

// --- Tree: treeData must be memoized ---
const treeView = readSrc('src/renderer/src/features/tree/TaskTreeView.tsx')
assert.match(treeView, /const treeData = useMemo/, 'TaskTreeView must memoize treeData')

// --- Gantt: derived tasks must be memoized ---
const ganttView = readSrc('src/renderer/src/features/gantt/GanttView.tsx')
assert.match(ganttView, /const ganttTasks = useMemo/, 'GanttView must memoize ganttTasks')

// --- Whiteboard: debounced save + embedded drawer defer ---
const whiteboard = readSrc('src/renderer/src/features/whiteboard/WhiteboardView.tsx')
assert.match(whiteboard, /scheduleSave/, 'WhiteboardView must debounce persistence')
assert.match(whiteboard, /setTimeout\([\s\S]*900/, 'Whiteboard save debounce should be ~900ms')
assert.match(whiteboard, /embedded/, 'WhiteboardView must support embedded drawer mode')
assert.match(whiteboard, /requestAnimationFrame\(\(\) => api\.refresh\(\)\)/, 'embedded whiteboard must refresh after mount')

const collabDrawer = readSrc('src/renderer/src/features/chat/ChatCollaborationDrawer.tsx')
assert.match(collabDrawer, /lazy\(\(\) => import\('@renderer\/features\/whiteboard\/WhiteboardView'\)\)/)
assert.match(collabDrawer, /drawerReady/, 'collab drawer must wait for drawer animation before tall panels')
assert.match(collabDrawer, /showTallPanel/, 'collab drawer must gate whiteboard/mindmap mount')
assert.match(collabDrawer, /afterOpenChange/, 'collab drawer must sync mount with Drawer afterOpenChange')

const docs06 = readSrc('docs/06_ROADMAP.md')
assert.match(docs06, /verify:core-views-perf/, 'docs/06 must reference verify:core-views-perf')

console.log('verify:core-views-perf OK')
