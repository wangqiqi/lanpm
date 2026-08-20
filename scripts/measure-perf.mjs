/**
 * Repeatable Electron perf baseline (SPRINT-29).
 * Default --quick writes a schema JSON under .lanpm/perf/ (gitignore).
 * UI timings need `npm run build` first. DB contrast uses Electron Node ABI.
 *
 * Usage:
 *   npm run measure:perf -- --schema-only
 *   npm run measure:perf -- --quick --cold
 *   npm run measure:perf -- --full
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import os from 'node:os'

const MEASURE_PERF_SCHEMA_VERSION = 1

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function gpuNote() {
  if (process.platform === 'linux') {
    return 'linux-disableHardwareAcceleration (src/main/index.ts); not comparable to GPU-on budgets'
  }
  return 'gpu-policy-unspecified'
}

function emptyMeasureReport(mode) {
  const startedAt = new Date().toISOString()
  return {
    schemaVersion: MEASURE_PERF_SCHEMA_VERSION,
    mode,
    startedAt,
    platform: process.platform,
    arch: process.arch,
    userDataDir: '',
    outPath: '',
    notes: {
      gpu: gpuNote(),
      binary: 'out/main/index.js (electron-vite build, not electron-builder installers)',
      budgetAligned: mode === 'full',
      docs05: 'docs/05 §5 cold-start / memory / Tab P95'
    },
    coldStartMs: { samples: [], median: null },
    rssIdleMb: null,
    rssChat100Mb: null,
    tabSwitchP95Ms: null,
    dbPlainMs: null,
    dbCipherMs: null
  }
}

function parseArgs(argv) {
  const flags = new Set()
  let outPath = ''
  for (const a of argv) {
    if (a === '--help' || a === '-h') flags.add('help')
    else if (a === '--schema-only') flags.add('schema-only')
    else if (a === '--quick') flags.add('quick')
    else if (a === '--full') flags.add('full')
    else if (a === '--cold') flags.add('cold')
    else if (a === '--memory') flags.add('memory')
    else if (a === '--tabs') flags.add('tabs')
    else if (a === '--db') flags.add('db')
    else if (a.startsWith('--out=')) outPath = a.slice('--out='.length)
    else if (a === '--out') flags.add('out-next')
    else if (flags.has('out-next')) {
      outPath = a
      flags.delete('out-next')
    }
  }
  const mode = flags.has('full') ? 'full' : 'quick'
  const anySlice = flags.has('cold') || flags.has('memory') || flags.has('tabs') || flags.has('db')
  return {
    help: flags.has('help'),
    schemaOnly: flags.has('schema-only'),
    mode,
    cold: flags.has('cold') || (!anySlice && !flags.has('schema-only') && !flags.has('help')),
    memory: flags.has('memory') || (!anySlice && !flags.has('schema-only') && !flags.has('help')),
    tabs: flags.has('tabs') || (!anySlice && !flags.has('schema-only') && !flags.has('help')),
    db: flags.has('db') || (!anySlice && !flags.has('schema-only') && !flags.has('help')),
    outPath
  }
}

function printHelp() {
  console.log(`measure-perf — LanPM baseline (TASK-2901+)

  --schema-only   Write empty JSON (CI / verify:measure-perf)
  --quick         Short idle; memory not §5-budget (default)
  --full          idle 60s, cold ×3, Tab ×10 (docs/05 §5)
  --cold --memory --tabs --db   Slice flags (omit all → run every slice)
  --out <path>    JSON path (default .lanpm/perf/latest.json)

Results are gitignored. Isolated userData under .lanpm/tmp/.
`)
}

function median(samples) {
  if (samples.length === 0) return null
  const s = [...samples].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

function p95(samples) {
  if (samples.length === 0) return null
  const sorted = [...samples].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)
  return sorted[Math.max(0, idx)] ?? null
}

function ensurePerfDirs() {
  const tmpRoot = join(root, '.lanpm', 'tmp')
  const perfRoot = join(root, '.lanpm', 'perf')
  mkdirSync(tmpRoot, { recursive: true })
  mkdirSync(perfRoot, { recursive: true })
  const userDataDir = mkdtempSync(join(tmpRoot, 'lanpm-perf-'))
  return {
    userDataDir,
    defaultOut: join(perfRoot, 'latest.json')
  }
}

async function runUiSlices(opts, report) {
  const ui = await import('./measure-perf-ui.mjs')
  return ui.runMeasurePerfUi({
    root,
    mode: opts.mode,
    cold: opts.cold,
    memory: opts.memory,
    tabs: opts.tabs,
    userDataDir: report.userDataDir,
    idleMs: opts.mode === 'full' ? 60_000 : 3_000,
    coldRuns: opts.mode === 'full' ? 3 : 1,
    tabRepeats: opts.mode === 'full' ? 10 : 2,
    median,
    p95
  })
}

function runDbSlice(report) {
  const electronNode = join(root, 'scripts', 'run-electron-node.mjs')
  const script = join(root, 'tests', 'integration', 'measure-db-perf.ts')
  const outFile = join(root, '.lanpm', 'perf', 'db-slice.json')
  mkdirSync(join(root, '.lanpm', 'perf'), { recursive: true })
  const r = spawnSync(process.execPath, [electronNode, '--experimental-strip-types', script], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, LANPM_MEASURE_DB_OUT: outFile }
  })
  if (r.status !== 0) {
    throw new Error(`measure-db-perf failed: ${r.stderr || r.stdout || r.status}`)
  }
  if (!existsSync(outFile)) {
    throw new Error('measure-db-perf did not write LANPM_MEASURE_DB_OUT')
  }
  const parsed = JSON.parse(readFileSync(outFile, 'utf8'))
  report.dbPlainMs = parsed.dbPlainMs
  report.dbCipherMs = parsed.dbCipherMs
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (opts.help) {
    printHelp()
    return
  }

  const dirs = ensurePerfDirs()
  const report = emptyMeasureReport(opts.mode)
  report.userDataDir = dirs.userDataDir
  report.outPath = opts.outPath || dirs.defaultOut
  report.host = os.hostname()

  if (opts.schemaOnly) {
    writeFileSync(report.outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
    console.log(`measure-perf: wrote schema ${report.outPath}`)
    return
  }

  const dbScript = join(root, 'tests', 'integration', 'measure-db-perf.ts')
  const uiScript = join(root, 'scripts', 'measure-perf-ui.mjs')

  if (opts.db) {
    if (!existsSync(dbScript)) {
      throw new Error(`missing ${dbScript}`)
    }
    runDbSlice(report)
  }

  if (opts.cold || opts.memory || opts.tabs) {
    if (!existsSync(uiScript)) {
      throw new Error(`missing ${uiScript}`)
    }
    const ui = await runUiSlices(opts, report)
    Object.assign(report, ui)
    if (typeof report.tabSwitchP95Ms === 'number') {
      report.notes.tabP95Ms = report.tabSwitchP95Ms
      report.notes.devBudgetMs = 150
      report.notes.prodBudgetMs = 100
    }
  }

  writeFileSync(report.outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(`measure-perf: wrote ${report.outPath}`)
}

const isMain = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
