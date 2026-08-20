/**
 * TASK-2901 — Perf measure harness guards.
 * Run: npm run verify:measure-perf
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync, unlinkSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readSrc(rel: string): string {
  const abs = join(root, rel)
  assert.ok(existsSync(abs), `missing ${rel}`)
  return readFileSync(abs, 'utf8')
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['measure:perf'], 'missing measure:perf script')
assert.ok(pkg.scripts?.['verify:measure-perf'], 'missing verify:measure-perf script')
assert.match(pkg.scripts['measure:perf'] ?? '', /scripts\/measure-perf\.mjs/)

const harness = readSrc('scripts/measure-perf.mjs')
assert.match(harness, /MEASURE_PERF_SCHEMA_VERSION/)
assert.match(harness, /emptyMeasureReport/)
assert.match(harness, /--schema-only/)
assert.match(harness, /\.lanpm['"]?, ['"]tmp/)
assert.match(harness, /\.lanpm['"]?, ['"]perf/)
assert.match(harness, /lanpm-perf-/)
assert.match(harness, /userDataDir/)
assert.match(harness, /coldStartMs/)
assert.match(harness, /rssIdleMb/)
assert.match(harness, /rssChat100Mb/)
assert.match(harness, /tabSwitchP95Ms/)
assert.match(harness, /dbPlainMs/)
assert.match(harness, /dbCipherMs/)
assert.match(harness, /notes[\s\S]*gpu/)
assert.match(harness, /disableHardwareAcceleration/)

const ui = readSrc('scripts/measure-perf-ui.mjs')
assert.match(ui, /LANPM_MEASURE/)
assert.match(ui, /coldMs/)
assert.match(ui, /measure-seed-chat/)
assert.match(ui, /nav-tab-/)

const mainSrc = readSrc('src/main/index.ts')
assert.match(mainSrc, /LANPM_MEASURE/)
assert.match(mainSrc, /\[lanpm:measure\] ready-to-show/)

const gitignore = readSrc('.gitignore')
assert.match(gitignore, /^\.lanpm\//m)

const outPath = join(root, '.lanpm', 'perf', 'verify-schema.json')
const r = spawnSync(process.execPath, [join(root, 'scripts/measure-perf.mjs'), '--schema-only', '--out', outPath], {
  cwd: root,
  encoding: 'utf8'
})
assert.equal(r.status, 0, `schema-only failed: ${r.stderr || r.stdout}`)
assert.ok(existsSync(outPath), 'schema-only must write JSON')
const report = JSON.parse(readFileSync(outPath, 'utf8')) as Record<string, unknown>
for (const key of [
  'schemaVersion',
  'mode',
  'startedAt',
  'platform',
  'userDataDir',
  'outPath',
  'notes',
  'coldStartMs',
  'rssIdleMb',
  'rssChat100Mb',
  'tabSwitchP95Ms',
  'dbPlainMs',
  'dbCipherMs'
]) {
  assert.ok(key in report, `missing JSON key ${key}`)
}
assert.equal(report.schemaVersion, 1)
assert.ok(typeof report.userDataDir === 'string' && String(report.userDataDir).includes('lanpm-perf-'))
const notes = report.notes as { gpu?: string; binary?: string }
assert.ok(notes?.gpu, 'notes.gpu required')
assert.match(String(notes.binary), /out\/main/)
unlinkSync(outPath)

console.log('verify-measure-perf OK')
