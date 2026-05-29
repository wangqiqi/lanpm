/**
 * Run a script with Electron's embedded Node (same ABI as the desktop app).
 * Use for verify scripts that import better-sqlite3 — avoids flipping native ABI.
 *
 * Usage: node scripts/run-electron-node.mjs [--experimental-strip-types] path/to/script.ts
 */
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { electronCiChromiumFlags } from './electron-ci-chromium-flags.mjs'
import { resolveElectronBin } from './resolve-electron-bin.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const electronBin = resolveElectronBin()

const args = process.argv.slice(2)
if (args.length === 0) {
  console.error('usage: node scripts/run-electron-node.mjs <node-args…>')
  process.exit(1)
}

if (!electronBin) {
  console.error('[lanpm] electron not installed — run npm install')
  process.exit(1)
}

const r = spawnSync(electronBin, [...electronCiChromiumFlags(), ...args], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
})
process.exit(r.status ?? 1)
