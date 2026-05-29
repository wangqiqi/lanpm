/**
 * AUTO-19：编排 Electron 无头 smoke（需先 build）。
 * Run: npm run verify:electron-smoke
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const electronBin =
  process.platform === 'win32'
    ? join(root, 'node_modules', 'electron', 'dist', 'electron.exe')
    : join(root, 'node_modules', 'electron', 'dist', 'electron')
const smokeApp = join(root, 'tests/integration/electron-smoke-app.mjs')
const rendererHtml = join(root, 'out/renderer/index.html')

assert.ok(existsSync(electronBin), 'electron binary missing — run npm install')
assert.ok(existsSync(rendererHtml), 'out/renderer/index.html missing — run npm run build first')
assert.ok(existsSync(smokeApp), `missing ${smokeApp}`)

const smokeEnv = { ...process.env }
delete smokeEnv.ELECTRON_RUN_AS_NODE

const r = spawnSync(electronBin, [smokeApp], {
  cwd: root,
  stdio: 'inherit',
  env: smokeEnv,
  timeout: 60_000
})

if (r.error) {
  console.error('verify:electron-smoke spawn error:', r.error.message)
  process.exit(1)
}
if (r.status !== 0) {
  process.exit(r.status ?? 1)
}

console.log('verify:electron-smoke: ok')
