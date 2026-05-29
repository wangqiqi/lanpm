/**
 * AUTO-20 / V-14b：亮暗七页截图（Electron 无头，输出至 LANPM_VISUAL_CAPTURE_DIR）。
 * Run: npm run verify:visual-screenshots
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync } from 'node:fs'
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

console.log(`verify:visual-screenshots: ok (${EXPECTED.length} png → ${outDir})`)
