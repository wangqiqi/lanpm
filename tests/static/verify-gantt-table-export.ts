/**
 * TASK-5902+ — Gantt task table export (Markdown + CSV).
 * Run: npm run verify:gantt-table-export
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:gantt-table-export'], 'missing verify:gantt-table-export script')

const shared = readFileSync(join(root, 'src/shared/task/ganttTableExport.ts'), 'utf8')
assert.match(shared, /ganttTableToMarkdown/)
assert.match(shared, /ganttTableToCsv/)
assert.match(shared, /UTF8_BOM|\\\\uFEFF/)

const download = readFileSync(
  join(root, 'src/renderer/src/features/gantt/ganttTableDownload.ts'),
  'utf8'
)
assert.match(download, /exportGanttTaskTable/)
assert.doesNotMatch(download, /exceljs/)

const view = readFileSync(join(root, 'src/renderer/src/features/gantt/GanttView.tsx'), 'utf8')
assert.match(view, /exportGanttChart/)
assert.match(view, /exportGanttTaskTable/)
assert.match(view, /gantt\.exportMd/)
assert.match(view, /gantt\.exportCsv/)
assert.match(view, /gantt\.exportPng/)
assert.match(view, /gantt\.exportPdf/)

const docs06 = readFileSync(join(root, 'docs/06_ROADMAP.md'), 'utf8')
assert.match(docs06, /verify:gantt-table-export/)
assert.match(docs06, /MD\/CSV/)

console.log('verify:gantt-table-export OK')
