#!/usr/bin/env node
/** 跨平台 dev 启动：清除 ELECTRON_RUN_AS_NODE（替代 Unix env -u） */
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const web = process.argv.includes('--web')

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE
if (web) env.LANPM_BROWSER_DEV = '1'

const args = ['electron-vite', 'dev', ...(web ? ['--rendererOnly'] : [])]
const bin = process.platform === 'win32' ? 'npx.cmd' : 'npx'

const child = spawn(bin, args, {
  cwd: root,
  env,
  stdio: 'inherit',
  shell: false
})
child.on('exit', (code, signal) => {
  if (signal) process.exit(1)
  process.exit(code ?? 1)
})
