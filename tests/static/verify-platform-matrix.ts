/**
 * TASK-269 — cross-platform release matrix wiring.
 * Run: npm run verify:platform-matrix
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const builder = readFileSync(join(root, 'electron-builder.yml'), 'utf8')
for (const needle of ['arch:', 'x64', 'arm64', 'nsis', 'dmg', 'AppImage', 'deb']) {
  assert.match(builder, new RegExp(needle), `electron-builder.yml missing ${needle}`)
}
assert.ok(
  /win:[\s\S]*arch:[\s\S]*x64[\s\S]*arm64/.test(builder) ||
    /win:[\s\S]*- x64[\s\S]*- arm64/.test(builder),
  'win must declare x64+arm64'
)
assert.ok(
  /mac:[\s\S]*- x64[\s\S]*- arm64/.test(builder),
  'mac must declare x64+arm64'
)
assert.ok(
  /linux:[\s\S]*- x64[\s\S]*- arm64/.test(builder),
  'linux must declare x64+arm64'
)

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
const scripts = pkg.scripts ?? {}
for (const key of [
  'dist',
  'dist:win',
  'dist:win:x64',
  'dist:win:arm64',
  'dist:mac',
  'dist:mac:x64',
  'dist:mac:arm64',
  'dist:linux',
  'dist:linux:x64',
  'dist:linux:arm64',
  'verify:platform-matrix',
  'ensure:native',
  'rebuild:native'
]) {
  assert.ok(scripts[key], `missing package.json script ${key}`)
}

const releaseYml = readFileSync(join(root, '.github/workflows/release.yml'), 'utf8')
assert.match(releaseYml, /macos-13/)
assert.match(releaseYml, /ubuntu-24\.04-arm/)
assert.match(releaseYml, /--mac --x64/)
assert.match(releaseYml, /--mac --arm64/)
assert.match(releaseYml, /--linux --arm64/)
assert.match(releaseYml, /builder_args/)

const ensure = readFileSync(join(root, 'scripts/ensure-native-deps.mjs'), 'utf8')
assert.match(ensure, /better-sqlite3/)
assert.match(ensure, /node-screenshots/)
assert.match(ensure, /REBUILD_MODULES/)

const doc05 = join(root, 'docs/05_测试与联调发布.md')
assert.ok(existsSync(doc05), 'docs/05_测试与联调发布.md required')
const docBody = readFileSync(doc05, 'utf8')
assert.match(docBody, /跨平台发版矩阵/)
assert.match(docBody, /冒烟清单/)
assert.match(docBody, /arm64/)
assert.match(docBody, /统信|麒麟/)

const roadmap = readFileSync(join(root, 'docs/06_ROADMAP.md'), 'utf8')
assert.match(roadmap, /05_测试与联调发布|verify:platform-matrix/)

const nav = readFileSync(join(root, 'docs/00_文档导航.md'), 'utf8')
assert.match(nav, /跨平台发版矩阵/)
assert.match(nav, /05_测试与联调发布/)

console.log('verify:platform-matrix OK (builder · dist:* · CI · native · docs)')
