#!/usr/bin/env node
/**
 * 零数据启动（等同新装：空 userData，走 Setup 向导）。
 * 数据目录：仓库 `.lanpm/fresh-zero/`（可删目录重来）。
 */
import { rmSync, mkdirSync } from 'node:fs'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const wipe = process.argv.includes('--wipe')
const noDemo = process.argv.includes('--no-demo')
const userData = path.join(root, '.lanpm', 'fresh-zero')

if (wipe) {
  rmSync(userData, { recursive: true, force: true })
}
mkdirSync(userData, { recursive: true })

const env = { ...process.env, LANPM_USER_DATA: userData }
console.log(
  `[lanpm] fresh userData → ${userData}${wipe ? ' (wiped)' : ''}${noDemo ? ' · no mock' : ''}`
)

const devArgs = [path.join(root, 'scripts/dev-run.mjs'), ...(noDemo ? ['--no-demo'] : [])]
const child = spawn(process.execPath, devArgs, {
  cwd: root,
  env,
  stdio: 'inherit',
  shell: false
})
child.on('exit', (code, signal) => {
  if (signal) process.exit(1)
  process.exit(code ?? 1)
})
