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
