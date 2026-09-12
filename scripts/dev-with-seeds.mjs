#!/usr/bin/env node
/**
 * Dev with LANPM_DISCOVER_SEEDS — auto manual-peer connect on startup (§6).
 * Usage:
 *   npm run dev:dual-peer -- 192.168.20.16:43124
 *   LANPM_DISCOVER_SEEDS=192.168.20.16:43124 npm run dev:dual-peer
 */
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const argSeeds = process.argv.slice(2).filter((a) => !a.startsWith('--')).join(',')
const seeds = (argSeeds || process.env.LANPM_DISCOVER_SEEDS || '').trim()

if (!seeds) {
  console.error(
    '[lanpm] dev:dual-peer — set peer address(es) host:43124\n' +
      '  npm run dev:dual-peer -- 192.168.20.16:43124\n' +
      '  LANPM_DISCOVER_SEEDS=192.168.20.16:43124 npm run dev:dual-peer'
  )
  process.exit(1)
}

const env = { ...process.env, LANPM_DISCOVER_SEEDS: seeds }
console.log(`[lanpm] LANPM_DISCOVER_SEEDS=${seeds}`)

const child = spawn(process.execPath, [path.join(root, 'scripts/dev-run.mjs')], {
  cwd: root,
  env,
  stdio: 'inherit',
  shell: false
})
child.on('exit', (code, signal) => {
  if (signal) process.exit(1)
  process.exit(code ?? 1)
})
