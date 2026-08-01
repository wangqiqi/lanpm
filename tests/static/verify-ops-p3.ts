/**
 * ops-p3 — Gateway HTTP embedded in main process + Web Terminal guards.
 * Run: npm run verify:ops-p3
 */
import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:ops-p3'], 'missing verify:ops-p3 script')
assert.ok(pkg.dependencies?.['node-pty'], 'missing node-pty dependency')
assert.ok(pkg.dependencies?.ws, 'missing ws dependency')

execSync('npm run verify:ops-p2', { cwd: root, stdio: 'inherit' })
execSync('npm run verify:ops-gateway-spike', { cwd: root, stdio: 'inherit' })

const httpServer = readFileSync(join(root, 'src/main/gateway/httpServer.ts'), 'utf8')
assert.match(httpServer, /assertLocalhostHost/)
assert.match(httpServer, /\/api\/v1\/list/)
assert.match(httpServer, /\/api\/v1\/files/)
assert.match(httpServer, /\/api\/v1\/terminal/)
assert.match(httpServer, /terminalEnabled/)
assert.match(httpServer, /UNAUTHORIZED/)

const config = readFileSync(join(root, 'src/main/gateway/config.ts'), 'utf8')
assert.match(config, /assertLocalhostHost/)

const channels = readFileSync(join(root, 'src/shared/ops/channels.ts'), 'utf8')
assert.match(channels, /ops:startGateway/)
assert.match(channels, /ops:stopGateway/)
assert.match(channels, /ops:getGatewayStatus/)

const ipc = readFileSync(join(root, 'src/main/ipc/ops.ts'), 'utf8')
assert.match(ipc, /OPS_IPC\.startGateway/)
assert.match(ipc, /OPS_IPC\.stopGateway/)
assert.match(ipc, /OPS_IPC\.getGatewayStatus/)

assert.ok(existsSync(join(root, 'src/main/gateway/web/files.html')))
assert.ok(existsSync(join(root, 'src/main/gateway/web/terminal.html')))
assert.ok(existsSync(join(root, 'src/renderer/src/features/ops/OpsGatewayPanel.tsx')))

const roadmap = readFileSync(join(root, 'docs/06_ROADMAP.md'), 'utf8')
const featureDoc = readFileSync(join(root, 'docs/07_插件与扩展.md'), 'utf8')
assert.match(roadmap, /verify:ops-p3/)
assert.match(featureDoc, /verify:ops-p3|Phase 3.*✅/)

console.log('verify:ops-p3 OK')
