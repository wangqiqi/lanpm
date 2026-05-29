/**
 * Ensures better-sqlite3 is compiled for the installed Electron (not system Node).
 * No-op when already loadable; auto-rebuilds on ABI mismatch or missing binary.
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const force = process.argv.includes('--force')
const verbose = process.env.LANPM_NATIVE_VERBOSE === '1' || force

const electronBin =
  process.platform === 'win32'
    ? join(root, 'node_modules', 'electron', 'dist', 'electron.exe')
    : join(root, 'node_modules', 'electron', 'dist', 'electron')

const nativeMod = join(
  root,
  'node_modules',
  'better-sqlite3',
  'build',
  'Release',
  'better_sqlite3.node'
)

function probe() {
  if (!existsSync(electronBin)) {
    return { ok: false, reason: 'electron-missing' }
  }
  if (!existsSync(nativeMod)) {
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

function rebuild() {
  console.log('[lanpm] Rebuilding better-sqlite3 for Electron …')
  const r = spawnSync('npx', ['@electron/rebuild', '-f', '-w', 'better-sqlite3'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

const first = probe()
if (first.ok && !force) {
  if (verbose) console.log('[lanpm] Native deps OK (better-sqlite3 ↔ Electron)')
  process.exit(0)
}

if (!first.ok) {
  if (first.reason === 'abi-mismatch') {
    console.warn(
      '[lanpm] better-sqlite3 was built for a different Node ABI than Electron — rebuilding automatically'
    )
  } else if (first.reason === 'electron-missing') {
    console.error('[lanpm] electron is not installed. Run: npm install')
    process.exit(1)
  } else {
    console.warn(`[lanpm] better-sqlite3 not ready (${first.reason}) — rebuilding`)
  }
  if (first.detail && verbose) console.warn(first.detail)
}

rebuild()

const second = probe()
if (!second.ok) {
  console.error('[lanpm] Rebuild finished but better-sqlite3 still cannot load under Electron')
  if (second.detail) console.error(second.detail)
  process.exit(1)
}

console.log('[lanpm] Native deps ready (better-sqlite3 ↔ Electron)')
