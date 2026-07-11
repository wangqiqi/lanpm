/**
 * TASK-188 — board tag filter + color helpers wiring.
 * Run: npm run verify:task-tags-filter
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  collectUniqueTaskTags,
  filterTasksByTags,
  resolveTagColor,
  tagColorHash
} from '../../src/shared/task/tags.ts'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')

const tagsSrc = readFileSync(join(projectRoot, 'src/shared/task/tags.ts'), 'utf8')
assert.match(tagsSrc, /filterTasksByTags/)
assert.match(tagsSrc, /tagColorHash/)
assert.match(tagsSrc, /resolveTagColor/)
assert.match(tagsSrc, /collectUniqueTaskTags/)

const boardSrc = readFileSync(
  join(projectRoot, 'src/renderer/src/features/board/BoardView.tsx'),
  'utf8'
)
assert.match(boardSrc, /filterTasksByTags/)
assert.match(boardSrc, /tagFilter/)
assert.match(boardSrc, /BoardTagPalette/)

const chipSrc = readFileSync(
  join(projectRoot, 'src/renderer/src/features/task/TaskTagChip.tsx'),
  'utf8'
)
assert.match(chipSrc, /resolveTagColor/)

const uiSrc = readFileSync(join(projectRoot, 'src/renderer/src/stores/uiStore.ts'), 'utf8')
assert.match(uiSrc, /tagColorOverridesByGroup/)
assert.match(uiSrc, /setTagColorOverride/)
assert.match(uiSrc, /board\.tagColorOverrides/)

const tasks = [
  { id: '1', tags: ['API'] },
  { id: '2', tags: ['docs'] },
  { id: '3', tags: ['api', 'urgent'] }
]
assert.deepEqual(
  filterTasksByTags(tasks, ['API']).map((t) => t.id),
  ['1', '3']
)
assert.deepEqual(collectUniqueTaskTags(tasks).sort(), ['API', 'docs', 'urgent'].sort())
assert.equal(tagColorHash('API'), tagColorHash('api'))
assert.equal(resolveTagColor('API', { api: '#112233' }), '#112233')

console.log('verify:task-tags-filter OK (helpers + board/ui wiring)')
