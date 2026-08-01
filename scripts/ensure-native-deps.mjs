/**
 * Ensures native addons load under the installed Electron (not system Node).
 * Covers better-sqlite3 + node-screenshots (electron-screenshots dependency).
 * No-op when already loadable; auto-rebuilds on ABI mismatch or missing binary.
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveElectronBin } from './resolve-electron-bin.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromRoot = createRequire(join(root, 'package.json'))
const force = process.argv.includes('--force')
const verbose = process.env.LANPM_NATIVE_VERBOSE === '1' || force

const electronBin = resolveElectronBin()

/** Packages passed to `@electron/rebuild -w` (comma-separated). */
const REBUILD_MODULES = ['better-sqlite3', 'node-screenshots', 'node-pty']

const sqliteNative = join(
  root,
  'node_modules',
  'better-sqlite3',
  'build',
  'Release',
  'better_sqlite3.node'
)

function probeSqlite() {
  if (!electronBin) {
    return { ok: false, reason: 'electron-missing' }
  }
  if (!existsSync(sqliteNative)) {
    return { ok: false, reason: 'native-missing' }
  }
  const r = spawnSync(
    electronBin,
    ['-e', "require('better-sqlite3')(':memory:')"],
    {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
    }
  )
  if (r.status === 0) return { ok: true }
  const detail = `${r.stderr || ''}${r.stdout || ''}`.trim()
  const reason = detail.includes('NODE_MODULE_VERSION') ? 'abi-mismatch' : 'load-failed'
  return { ok: false, reason, detail }
}

/**
 * node-screenshots ships platform prebuilds; require() under Electron catches
 * wrong-ABI / missing optional binary after host npm install.
 */
function probeScreenshots() {
  if (!electronBin) {
    return { ok: false, reason: 'electron-missing' }
  }
  let resolved
  try {
    resolved = requireFromRoot.resolve('node-screenshots')
  } catch {
    // Optional if electron-screenshots tree not installed yet
    return { ok: true, skipped: true }
  }
  if (!resolved) return { ok: true, skipped: true }

  const r = spawnSync(
    electronBin,
    ['-e', "require('node-screenshots')"],
    {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
    }
  )
  if (r.status === 0) return { ok: true }
  const detail = `${r.stderr || ''}${r.stdout || ''}`.trim()
  const reason = detail.includes('NODE_MODULE_VERSION') ? 'abi-mismatch' : 'load-failed'
  return { ok: false, reason, detail }
}

function rebuild() {
  const list = REBUILD_MODULES.join(',')
  console.log(`[lanpm] Rebuilding native modules for Electron: ${list}`)
  const r = spawnSync('npx', ['@electron/rebuild', '-f', '-w', list], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

const sqliteFirst = probeSqlite()
const shotsFirst = probeScreenshots()
const allOk = sqliteFirst.ok && shotsFirst.ok

if (allOk && !force) {
  if (verbose) {
    console.log('[lanpm] Native deps OK (better-sqlite3 + node-screenshots ↔ Electron)')
  }
  process.exit(0)
}

if (!sqliteFirst.ok) {
  if (sqliteFirst.reason === 'abi-mismatch') {
    console.warn(
      '[lanpm] better-sqlite3 was built for a different Node ABI than Electron — rebuilding'
    )
  } else if (sqliteFirst.reason === 'electron-missing') {
    console.error('[lanpm] electron is not installed. Run: npm install')
    process.exit(1)
  } else {
    console.warn(`[lanpm] better-sqlite3 not ready (${sqliteFirst.reason}) — rebuilding`)
  }
  if (sqliteFirst.detail && verbose) console.warn(sqliteFirst.detail)
}

if (!shotsFirst.ok && !shotsFirst.skipped) {
  console.warn(`[lanpm] node-screenshots not ready (${shotsFirst.reason}) — rebuilding`)
  if (shotsFirst.detail && verbose) console.warn(shotsFirst.detail)
}

rebuild()

const sqliteSecond = probeSqlite()
if (!sqliteSecond.ok) {
  console.error('[lanpm] Rebuild finished but better-sqlite3 still cannot load under Electron')
  if (sqliteSecond.detail) console.error(sqliteSecond.detail)
  process.exit(1)
}

const shotsSecond = probeScreenshots()
if (!shotsSecond.ok && !shotsSecond.skipped) {
  console.warn(
    '[lanpm] node-screenshots still failed to load after rebuild — screenshot feature may break; continuing'
  )
  if (shotsSecond.detail) console.warn(shotsSecond.detail)
}

console.log('[lanpm] Native deps ready (better-sqlite3 + node-screenshots ↔ Electron)')
