/**
 * TASK-6001 — Four long-list surfaces + repeatable seed.
 * Run: npm run verify:list-scroll-seed
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  LIST_SCROLL_GROUP_ID,
  LIST_SCROLL_SURFACES,
  LIST_SCROLL_UNHIDE_VIEWS,
  listScrollNavPreferencesDocument
} from '../../src/shared/perf/listScrollMeasure.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readSrc(rel: string): string {
  const abs = join(root, rel)
  assert.ok(existsSync(abs), `missing ${rel}`)
  return readFileSync(abs, 'utf8')
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:list-scroll-seed'], 'missing verify:list-scroll-seed')
assert.match(pkg.scripts['verify:list-scroll-seed'] ?? '', /verify-list-scroll-seed/)

assert.equal(LIST_SCROLL_SURFACES.length, 4)
assert.equal(LIST_SCROLL_GROUP_ID, 'demo-project')
assert.deepEqual([...LIST_SCROLL_UNHIDE_VIEWS], ['files', 'gantt'])

const views = LIST_SCROLL_SURFACES.map((s) => s.view)
assert.deepEqual(views, ['chat', 'board', 'files', 'gantt'])

const chat = readSrc('src/renderer/src/features/chat/ChatView.tsx')
assert.match(chat, /data-testid="chat-message-list"/)

const board = readSrc('src/renderer/src/features/board/BoardView.tsx')
assert.match(board, /bodyTestId="board-column-scroll"/)

const island = readSrc('src/renderer/src/ui/IslandPanel.tsx')
assert.match(island, /bodyTestId/)

const files = readSrc('src/renderer/src/features/files/FilesView.tsx')
assert.match(files, /data-testid="files-table-scroll"/)

const gantt = readSrc('src/renderer/src/features/gantt/GanttView.tsx')
assert.match(gantt, /data-testid="gantt-chart-scroll"/)

const seed = readSrc('tests/integration/measure-seed-lists.ts')
assert.match(seed, /LANPM_MEASURE_USER_DATA/)
assert.match(seed, /measure-seed-lists/)
assert.match(seed, /LIST_SCROLL_NAV_FILE/)
for (const s of LIST_SCROLL_SURFACES) {
  assert.match(seed, new RegExp(s.kind))
}

const nav = listScrollNavPreferencesDocument()
assert.ok(!nav.global.hiddenViews.includes('files'))
assert.ok(!nav.global.hiddenViews.includes('gantt'))

console.log('verify-list-scroll-seed OK')
