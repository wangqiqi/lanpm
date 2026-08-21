/**
 * TASK-6103 — Linux installer smoke harness (static).
 * Launch unpacked binary with: LANPM_REQUIRE_INSTALLER=1 npm run verify:linux-installer-smoke
 * Run: npm run verify:linux-installer-smoke
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readSrc(rel: string): string {
  const abs = join(root, rel)
  assert.ok(existsSync(abs), `missing ${rel}`)
  return readFileSync(abs, 'utf8')
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['dist:linux:x64'], 'missing dist:linux:x64')
assert.match(pkg.scripts['dist:linux:x64'] ?? '', /electron-builder --linux --x64/)
assert.ok(pkg.scripts?.['verify:linux-installer-smoke'], 'missing verify:linux-installer-smoke')
assert.match(pkg.scripts['verify:linux-installer-smoke'] ?? '', /verify-linux-installer-smoke/)

const builder = readSrc('electron-builder.yml')
assert.match(builder, /target:\s*\n\s*- target: AppImage/)
assert.match(builder, /- target: deb/)

const smoke = readSrc('scripts/linux-installer-smoke.mjs')
assert.match(smoke, /linux-unpacked['"]?, ['"]lanpm/)
assert.match(smoke, /nav-tab-chat/)
assert.match(smoke, /LANPM_REQUIRE_INSTALLER/)
assert.match(smoke, /--no-sandbox/)

if (process.env.LANPM_REQUIRE_INSTALLER === '1') {
  const r = spawnSync(process.execPath, [join(root, 'scripts/linux-installer-smoke.mjs')], {
    cwd: root,
    encoding: 'utf8',
    env: process.env
  })
  assert.equal(r.status, 0, `linux-installer-smoke failed:\n${r.stderr || r.stdout}`)
  console.log(r.stdout.trim())
} else {
  console.log('linux-installer-smoke launch skipped (set LANPM_REQUIRE_INSTALLER=1 after dist:linux:x64)')
}
console.log('verify-linux-installer-smoke OK')
