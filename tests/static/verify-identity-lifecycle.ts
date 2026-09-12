/**
 * SPRINT-LOCAL-IDENTITY-01 — SSOT + IPC surface (no Electron DB import).
 * Run: npm run verify:identity-lifecycle
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { projectRoot } from '../projectRoot.ts'

const root = projectRoot

const lifecycle = readFileSync(join(root, 'src/shared/identity/lifecycle.ts'), 'utf8')
for (const row of ['reuse_only', 'reactivate', 'new_user', 'wipe'] as const) {
  assert.match(lifecycle, new RegExp(row), `lifecycle SSOT mentions ${row}`)
}

const setupSrc = readFileSync(join(root, 'src/main/identity/setup.ts'), 'utf8')
assert.match(setupSrc, /reactivateLocalIdentity/, 'setup exports reactivateLocalIdentity')
assert.match(setupSrc, /writeRebindHint/, 'reset writes rebind hint')
assert.match(setupSrc, /err\.useReactivateForExistingIdentity/, 'completeSetup guards rebind')

const ipcSrc = readFileSync(join(root, 'src/main/ipc/identity.ts'), 'utf8')
assert.match(ipcSrc, /identity:reactivateLocalIdentity/, 'IPC registers reactivate')

const preloadSrc = readFileSync(join(root, 'src/preload/index.ts'), 'utf8')
assert.match(preloadSrc, /reactivateLocalIdentity/, 'preload exposes reactivate')

console.log('verify:identity-lifecycle OK')
