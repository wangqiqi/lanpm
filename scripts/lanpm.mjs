#!/usr/bin/env node
/**
 * LanPM CLI — runs under Electron's embedded Node (better-sqlite3 ABI).
 */
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveElectronBin } from './resolve-electron-bin.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const electronBin = resolveElectronBin()
const forwarded = process.argv.slice(2)

if (!electronBin) {
  console.error('[lanpm] electron not installed — run npm install')
  process.exit(1)
}

const nodeArgs = ['--experimental-strip-types', join(root, 'src/cli/main.ts'), ...forwarded]
const result = spawnSync(electronBin, nodeArgs, {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
})
process.exit(result.status ?? 1)
