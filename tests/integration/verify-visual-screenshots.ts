/**
 * AUTO-20 / V-14b：亮暗七页截图（Electron 无头，输出至 LANPM_VISUAL_CAPTURE_DIR）。
 * Run: npm run verify:visual-screenshots
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const electronBin =
  process.platform === 'win32'
    ? join(root, 'node_modules', 'electron', 'dist', 'electron.exe')
    : join(root, 'node_modules', 'electron', 'dist', 'electron')
const mainJs = join(root, 'out/main/index.js')
const outDir = process.env.LANPM_VISUAL_CAPTURE_DIR ?? join(root, '.lanpm/visual-screenshots')

const EXPECTED = [
  'dark_setup',
  'light_setup',
  'dark_chat',
  'light_chat',
  'dark_board',
  'light_board',
  'dark_tree',
  'light_tree',
  'dark_gantt',
  'light_gantt',
  'dark_files',
  'light_files',
  'dark_cockpit',
  'light_cockpit'
] as const

assert.ok(existsSync(electronBin), 'electron binary missing')
assert.ok(existsSync(mainJs), 'out/main/index.js missing — run npm run build first')

const userData = mkdtempSync(join(tmpdir(), 'lanpm-visual-cap-'))

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE
env.LANPM_VISUAL_CAPTURE_DIR = outDir
env.LANPM_USER_DATA = userData
env.LANPM_NETWORK = 'stub'

const r = spawnSync(electronBin, [mainJs], {
  cwd: root,
  stdio: 'inherit',
  env,
  timeout: 600_000
})

if (r.error) {
  console.error('verify:visual-screenshots spawn error:', r.error.message)
  process.exit(1)
}
if (r.status !== 0) {
  process.exit(r.status ?? 1)
}

const written = new Set(
  readdirSync(outDir)
    .filter((f) => f.endsWith('.png'))
    .map((f) => f.replace(/\.png$/, ''))
)

const missing = EXPECTED.filter((name) => !written.has(name))
assert.equal(missing.length, 0, `missing screenshots: ${missing.join(', ')} → ${outDir}`)

const MIN_BYTES = 8_000
/** 含排期任务时甘特截图应大于纯空态（~40.8KB） */
const MIN_GANTT_BYTES = 41_000
const THEME_PAGES = ['chat', 'board', 'tree', 'gantt', 'files', 'cockpit'] as const

for (const name of EXPECTED) {
  const path = join(outDir, `${name}.png`)
  const size = statSync(path).size
  assert.ok(size >= MIN_BYTES, `${name}.png too small (${size} B) — blank or error page?`)
}

for (const theme of ['light', 'dark'] as const) {
  const ganttPath = join(outDir, `${theme}_gantt.png`)
  const ganttSize = statSync(ganttPath).size
  assert.ok(
    ganttSize >= MIN_GANTT_BYTES,
    `${theme}_gantt.png too small (${ganttSize} B) — gantt chart may be empty`
  )
}

for (const page of THEME_PAGES) {
  const light = readFileSync(join(outDir, `light_${page}.png`))
  const dark = readFileSync(join(outDir, `dark_${page}.png`))
  const lightMd5 = createHash('md5').update(light).digest('hex')
  const darkMd5 = createHash('md5').update(dark).digest('hex')
  assert.notEqual(
    lightMd5,
    darkMd5,
    `light_${page}.png and dark_${page}.png are identical — theme not applied`
  )
}

const setupLight = readFileSync(join(outDir, 'light_setup.png'))
const setupDark = readFileSync(join(outDir, 'dark_setup.png'))
assert.notEqual(
  createHash('md5').update(setupLight).digest('hex'),
  createHash('md5').update(setupDark).digest('hex'),
  'light_setup.png and dark_setup.png are identical'
)

console.log(`verify:visual-screenshots: ok (${EXPECTED.length} png → ${outDir})`)
