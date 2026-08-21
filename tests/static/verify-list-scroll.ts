/**
 * TASK-6002 — List scroll measure harness.
 * Run: npm run verify:list-scroll
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync, unlinkSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  LIST_SCROLL_FRAME_P95_GO_MS,
  LIST_SCROLL_LONG_TASK_GO_MS,
  LIST_SCROLL_SURFACES
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
assert.ok(pkg.scripts?.['measure:list-scroll'], 'missing measure:list-scroll')
assert.ok(pkg.scripts?.['verify:list-scroll'], 'missing verify:list-scroll')
assert.match(pkg.scripts['measure:list-scroll'] ?? '', /measure-list-scroll\.mjs/)

const harness = readSrc('scripts/measure-list-scroll.mjs')
assert.match(harness, /LIST_SCROLL_SCHEMA_VERSION/)
assert.match(harness, /--schema-only/)
assert.match(harness, /FRAME_P95_GO_MS = 50/)
assert.match(harness, /LONG_TASK_GO_MS = 50/)
assert.equal(LIST_SCROLL_FRAME_P95_GO_MS, 50)
assert.equal(LIST_SCROLL_LONG_TASK_GO_MS, 50)

const ui = readSrc('scripts/measure-list-scroll-ui.mjs')
assert.match(ui, /buffered: false/)
assert.match(ui, /measure-seed-lists/)
assert.match(ui, /launchMeasured/)
assert.match(ui, /nav-tab-\$\{view\}/)
for (const s of LIST_SCROLL_SURFACES) {
  assert.match(ui, new RegExp(`view: '${s.view}'`))
  assert.match(ui, new RegExp(s.testId))
}

const outPath = join(root, '.lanpm', 'perf', 'verify-list-scroll-schema.json')
const r = spawnSync(process.execPath, [join(root, 'scripts/measure-list-scroll.mjs'), '--schema-only', '--out', outPath], {
  cwd: root,
  encoding: 'utf8'
})
assert.equal(r.status, 0, `schema-only failed: ${r.stderr || r.stdout}`)
assert.ok(existsSync(outPath), 'schema-only must write JSON')
const report = JSON.parse(readFileSync(outPath, 'utf8')) as {
  schemaVersion?: number
  verdict?: string
  notes?: { frameP95GoMs?: number; longTaskGoMs?: number }
}
assert.equal(report.schemaVersion, 1)
assert.equal(report.verdict, 'NO-GO')
assert.equal(report.notes?.frameP95GoMs, 50)
assert.equal(report.notes?.longTaskGoMs, 50)
unlinkSync(outPath)

const docs06 = readFileSync(join(root, 'docs/06_ROADMAP.md'), 'utf8')
assert.match(docs06, /measure:list-scroll/)
assert.match(docs06, /NO-GO/)

console.log('verify-list-scroll OK')
