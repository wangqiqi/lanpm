/**
 * TASK-249 — A3 project files / deliverables wiring.
 * Run: npm run verify:project-files
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'
import {
  buildDeliverableIndex,
  filterDeliverableFiles,
  filterFilesByTaskId
} from '../../src/shared/task/deliverables.ts'
import { mergeLinkedFileId, removeLinkedFileId } from '../../src/shared/task/linkFile.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const idx = buildDeliverableIndex([
  { taskId: 't1', title: 'Ship', linkedFileIds: ['f1', 'f2'] },
  { taskId: 't2', title: 'Gone', linkedFileIds: ['f1'], deletedAt: '2026-01-01T00:00:00Z' }
])
assert.deepEqual(idx.fileToTaskIds.get('f1'), ['t1'])
assert.deepEqual(
  filterDeliverableFiles([{ fileId: 'f1' }, { fileId: 'f3' }], idx.fileToTaskIds).map(
    (f) => f.fileId
  ),
  ['f1']
)
assert.deepEqual(
  filterFilesByTaskId([{ fileId: 'f1' }, { fileId: 'f2' }], 't1', idx.taskToFileIds).map(
    (f) => f.fileId
  ),
  ['f1', 'f2']
)
assert.deepEqual(removeLinkedFileId(mergeLinkedFileId(['f1'], 'f2'), 'f1'), ['f2'])

assert.ok(existsSync(join(root, 'src/shared/task/deliverables.ts')))
assert.ok(existsSync(join(root, 'src/shared/task/linkFile.ts')))

const filesView = readFileSync(
  join(root, 'src/renderer/src/features/files/FilesView.tsx'),
  'utf8'
)
assert.match(filesView, /libraryScope/)
assert.match(filesView, /applyLibraryFilters/)
assert.match(filesView, /buildDeliverableIndex/)
assert.match(filesView, /mergeLinkedFileId/)
assert.match(filesView, /removeLinkedFileId/)
assert.match(filesView, /useLocateTask/)
assert.match(filesView, /openLinkedTask/)

const model = readFileSync(
  join(root, 'src/renderer/src/features/files/fileListModel.ts'),
  'utf8'
)
assert.match(model, /applyLibraryFilters/)
assert.match(model, /FileLibraryScope/)

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:project-files'], 'missing verify:project-files')

const docs01 = readFileSync(join(root, 'docs/01_产品需求文档.md'), 'utf8')
assert.match(docs01, /交付物（A3）/)

const feige = readFileSync(join(root, 'docs/飞鸽飞秋.md'), 'utf8')
assert.match(feige, /verify:project-files/)

console.log('verify:project-files OK (deliverables index · FilesView · docs)')
