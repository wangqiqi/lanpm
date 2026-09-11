/**
 * TASK-2901 — Perf measure harness guards.
 * Run: npm run verify:measure-perf
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync, unlinkSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { linuxGpuNote } from '../../src/shared/ops/linuxGpuPolicy.ts'

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
assert.doesNotMatch(harness, /MEASURE_PERF_REQUIRED_KEYS/)
assert.doesNotMatch(harness, /not present yet/)
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
assert.match(harness, /devBudgetMs/)
assert.match(harness, /LANPM_MEASURE_DB_OUT/)
assert.match(harness, /LANPM_ENABLE_GPU/)
assert.match(harness, /linux-LANPM_ENABLE_GPU=1/)
assert.ok(existsSync(join(root, 'tests/integration/measure-db-perf.ts')))

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

const envOff = { ...process.env }
delete envOff.LANPM_ENABLE_GPU

const outPath = join(root, '.lanpm', 'perf', 'verify-schema.json')
const r = spawnSync(process.execPath, [join(root, 'scripts/measure-perf.mjs'), '--schema-only', '--out', outPath], {
  cwd: root,
  encoding: 'utf8',
  env: envOff
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
assert.equal(notes.gpu, linuxGpuNote(process.platform, envOff))
assert.match(String(notes.binary), /\.lanpm\/artifact\/out\/main/)
unlinkSync(outPath)

const outOn = join(root, '.lanpm', 'perf', 'verify-schema-gpu-on.json')
const envOn = { ...envOff, LANPM_ENABLE_GPU: '1' }
const rOn = spawnSync(process.execPath, [join(root, 'scripts/measure-perf.mjs'), '--schema-only', '--out', outOn], {
  cwd: root,
  encoding: 'utf8',
  env: envOn
})
assert.equal(rOn.status, 0, `schema-only opt-in failed: ${rOn.stderr || rOn.stdout}`)
const reportOn = JSON.parse(readFileSync(outOn, 'utf8')) as { notes?: { gpu?: string } }
assert.equal(reportOn.notes?.gpu, linuxGpuNote(process.platform, envOn))
if (process.platform === 'linux') {
  assert.notEqual(notes.gpu, reportOn.notes?.gpu, 'Linux notes.gpu must differ default-off vs opt-in')
}
unlinkSync(outOn)

console.log('verify-measure-perf OK')
