/**
 * SPIKE-OPS-001 — Ops gateway spike guards.
 * Run: npm run verify:ops-gateway-spike
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const toolRoot = join(root, 'tools/lanpm-gateway')

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
const roadmap = readFileSync(join(root, 'docs/06_ROADMAP.md'), 'utf8')
const featureDoc = readFileSync(join(root, 'docs/07_插件与扩展.md'), 'utf8')

assert.ok(pkg.scripts?.['verify:ops-gateway-spike'], 'missing verify:ops-gateway-spike script')
assert.ok(existsSync(join(toolRoot, 'package.json')), 'tools/lanpm-gateway/package.json')
assert.ok(existsSync(join(toolRoot, 'src/server.ts')), 'tools/lanpm-gateway/src/server.ts')
assert.ok(existsSync(join(toolRoot, 'src/pathGuard.ts')), 'tools/lanpm-gateway/src/pathGuard.ts')
assert.ok(existsSync(join(toolRoot, 'README.md')), 'tools/lanpm-gateway/README.md')

const serverSrc = readFileSync(join(toolRoot, 'src/server.ts'), 'utf8')
assert.match(serverSrc, /\/api\/v1\/list/)
assert.match(serverSrc, /\/api\/v1\/files/)
assert.match(serverSrc, /PATH_FORBIDDEN/)

const configSrc = readFileSync(join(toolRoot, 'src/config.ts'), 'utf8')
assert.match(configSrc, /127\.0\.0\.1/)

assert.match(roadmap, /verify:ops-gateway-spike/)
assert.match(roadmap, /SPIKE-OPS-001|ops-gateway/i)
assert.match(featureDoc, /SPIKE.*已交付|SPIKE-OPS-001/i)

console.log('verify:ops-gateway-spike OK (tools/lanpm-gateway · docs anchors)')
