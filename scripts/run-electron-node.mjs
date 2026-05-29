/**
 * Run a script with Electron's embedded Node (same ABI as the desktop app).
 * Use for verify scripts that import better-sqlite3 — avoids flipping native ABI.
 *
 * Usage: node scripts/run-electron-node.mjs [--experimental-strip-types] path/to/script.ts
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const electronBin =
  process.platform === 'win32'
    ? join(root, 'node_modules', 'electron', 'dist', 'electron.exe')
    : join(root, 'node_modules', 'electron', 'dist', 'electron')

const args = process.argv.slice(2)
if (args.length === 0) {
  console.error('usage: node scripts/run-electron-node.mjs <node-args…>')
  process.exit(1)
}

if (!existsSync(electronBin)) {
  console.error('[lanpm] electron not installed — run npm install')
  process.exit(1)
}

const r = spawnSync(electronBin, args, {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
})
process.exit(r.status ?? 1)
