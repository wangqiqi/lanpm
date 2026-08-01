#!/usr/bin/env node
/** 跨平台 dev 启动：清除 ELECTRON_RUN_AS_NODE（替代 Unix env -u） */
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

function ensureLinuxPollingEnv(env) {
  if (env.LANPM_VITE_POLLING === '1') return
  if (process.platform !== 'linux') return
  try {
    const max = Number(readFileSync('/proc/sys/fs/inotify/max_user_watches', 'utf8').trim())
    if (Number.isFinite(max) && max < 200_000) {
      env.LANPM_VITE_POLLING = '1'
      console.warn(
        `[lanpm] inotify max_user_watches=${max} 偏低，已启用 Vite 轮询监视。` +
          ' 建议: echo fs.inotify.max_user_watches=524288 | sudo tee /etc/sysctl.d/99-inotify.conf && sudo sysctl --system'
      )
    }
  } catch {
    // ignore
  }
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const web = process.argv.includes('--web')

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE
if (web) env.LANPM_BROWSER_DEV = '1'
// 开发：显式注入 LANPM_LICENSE_SKIP_VERIFY=1；构建/未打包 dist 不自动绕过
if (env.LANPM_LICENSE_SKIP_VERIFY !== '0') {
  env.LANPM_LICENSE_SKIP_VERIFY = '1'
}
ensureLinuxPollingEnv(env)

const cli = path.join(root, 'node_modules', 'electron-vite', 'bin', 'electron-vite.js')
const args = [cli, 'dev', ...(web ? ['--rendererOnly'] : [])]

const child = spawn(process.execPath, args, {
  cwd: root,
  env,
  stdio: 'inherit',
  shell: false
})
child.on('exit', (code, signal) => {
  if (signal) process.exit(1)
  process.exit(code ?? 1)
})
