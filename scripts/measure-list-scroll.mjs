/**
 * Four-view long-list scroll measure (SPRINT-60).
 * GO virtuoso if any scrollable surface has rAF frame P95 ≥ 50ms or long-task max ≥ 50ms.
 *
 * Usage:
 *   npm run measure:list-scroll -- --schema-only
 *   npm run measure:list-scroll            # needs `npm run build` + Playwright Electron
 */
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import os from 'node:os'

const LIST_SCROLL_SCHEMA_VERSION = 1
/** Keep in sync with src/shared/perf/listScrollMeasure.ts LIST_SCROLL_FRAME_P95_GO_MS */
const FRAME_P95_GO_MS = 50
/** Keep in sync with LIST_SCROLL_LONG_TASK_GO_MS */
const LONG_TASK_GO_MS = 50

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function emptyReport(mode) {
  return {
    schemaVersion: LIST_SCROLL_SCHEMA_VERSION,
    mode,
    startedAt: new Date().toISOString(),
    platform: process.platform,
    arch: os.arch(),
    host: os.hostname(),
    userDataDir: '',
    outPath: '',
    notes: {
      docs: 'SPRINT-60 list scroll; GO = consider react-virtuoso',
      frameP95GoMs: FRAME_P95_GO_MS,
      longTaskGoMs: LONG_TASK_GO_MS
    },
    surfaces: [],
    verdict: 'NO-GO'
  }
}

function parseArgs(argv) {
  const flags = new Set()
  let outPath = ''
  for (const a of argv) {
    if (a === '--help' || a === '-h') flags.add('help')
    else if (a === '--schema-only') flags.add('schema-only')
    else if (a.startsWith('--out=')) outPath = a.slice('--out='.length)
    else if (a === '--out') flags.add('out-next')
    else if (flags.has('out-next')) {
      outPath = a
      flags.delete('out-next')
    }
  }
  return {
    help: flags.has('help'),
    schemaOnly: flags.has('schema-only'),
    outPath
  }
}

function printHelp() {
  console.log(`measure-list-scroll — chat/board/files/gantt scroll jank (TASK-6002)

  --schema-only   Write empty JSON (CI / verify:list-scroll)
  --out <path>    JSON path (default .lanpm/perf/list-scroll-latest.json)

GO if a scrollable surface has frame P95 ≥ ${FRAME_P95_GO_MS}ms or long-task ≥ ${LONG_TASK_GO_MS}ms.
Needs out/main/index.js (npm run build). Isolated userData under .lanpm/tmp/.
`)
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (opts.help) {
    printHelp()
    return
  }

  const tmpRoot = join(root, '.lanpm', 'tmp')
  const perfRoot = join(root, '.lanpm', 'perf')
  mkdirSync(tmpRoot, { recursive: true })
  mkdirSync(perfRoot, { recursive: true })
  const userDataDir = mkdtempSync(join(tmpRoot, 'lanpm-list-scroll-'))
  const report = emptyReport(opts.schemaOnly ? 'schema' : 'quick')
  report.userDataDir = userDataDir
  report.outPath = opts.outPath || join(perfRoot, 'list-scroll-latest.json')

  if (opts.schemaOnly) {
    writeFileSync(report.outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
    console.log(`measure-list-scroll: wrote schema ${report.outPath}`)
    return
  }

  const ui = await import('./measure-list-scroll-ui.mjs')
  const patch = await ui.runMeasureListScroll({
    root,
    userDataDir,
    frameP95GoMs: FRAME_P95_GO_MS,
    longTaskGoMs: LONG_TASK_GO_MS
  })
  Object.assign(report, patch)
  writeFileSync(report.outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(`measure-list-scroll: verdict=${report.verdict} ${report.outPath}`)
}

const isMain = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
