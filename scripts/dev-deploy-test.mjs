#!/usr/bin/env node
/**
 * 双机验证：清空本机 userData → 无 mock 启动 → 可选 LAN TCP 探测。
 *   npm run dev:deploy-test -- 192.168.20.12:43124
 */
import { spawn, spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const peer = process.argv.slice(2).filter((a) => !a.startsWith('--')).join(',')
if (!peer) {
  console.error(
    '[lanpm] dev:deploy-test — peer host:43124 required\n' +
      '  npm run dev:deploy-test -- 192.168.20.12:43124'
  )
  process.exit(1)
}

spawnSync(process.execPath, [path.join(root, 'scripts/wipe-local-userdata.mjs')], {
  cwd: root,
  stdio: 'inherit'
})

const probe = spawnSync(
  process.execPath,
  ['--experimental-strip-types', path.join(root, 'tests/integration/verify-dual-peer-link.ts')],
  {
    cwd: root,
    env: { ...process.env, LANPM_DUAL_PEER: peer },
    stdio: 'inherit',
    encoding: 'utf8'
  }
)
if (probe.status !== 0) {
  console.warn('[lanpm] verify:dual-peer-link failed (peer offline?) — still starting app')
}

const child = spawn(
  process.execPath,
  [path.join(root, 'scripts/dev-with-seeds.mjs'), peer],
  { cwd: root, stdio: 'inherit', shell: false }
)
child.on('exit', (code, signal) => {
  if (signal) process.exit(1)
  process.exit(code ?? 1)
})
