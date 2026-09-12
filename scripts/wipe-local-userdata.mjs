#!/usr/bin/env node
/**
 * 清空本机 LanPM 用户数据（开发手验 / 双机验证用，不可恢复）。
 * - Linux 默认：~/.config/LanPM
 * - 仓库内：.lanpm/fresh-zero · dev-a · dev-b
 */
import { rmSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const targets = [
  path.join(homedir(), '.config', 'LanPM'),
  path.join(homedir(), '.config', 'lanpm'),
  path.join(root, '.lanpm', 'fresh-zero'),
  path.join(root, '.lanpm', 'dev-a'),
  path.join(root, '.lanpm', 'dev-b')
]

for (const dir of targets) {
  if (!existsSync(dir)) continue
  rmSync(dir, { recursive: true, force: true })
  console.log(`[lanpm] removed ${dir}`)
}

console.log('[lanpm] local userData wipe done — next start = Setup 向导（无 mock，除非 dev:demo）')
