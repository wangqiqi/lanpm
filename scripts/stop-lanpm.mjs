#!/usr/bin/env node
/**
 * 结束本机其它 LanPM/Electron 进程（开发/双机手验前用，避免双图标与 43124 占用）。
 * 不杀当前 npm/node 包装进程；仅匹配带 lanpm 主入口或 LANPM_ 环境的 electron。
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const selfPid = process.pid

function listPidsUnix() {
  const r = spawnSync('ps', ['-eo', 'pid,args'], { encoding: 'utf8' })
  if (r.status !== 0) return []
  const hits = []
  for (const line of r.stdout.split('\n')) {
    const m = line.match(/^\s*(\d+)\s+(.*)$/)
    if (!m) continue
    const pid = Number(m[1])
    const args = m[2]
    if (pid === selfPid) continue
    if (!/electron/i.test(args) && !/LanPM/i.test(args)) continue
    if (
      args.includes('out/main/index') ||
      args.includes('.lanpm/artifact') ||
      args.includes('lanpm') ||
      args.includes('LANPM')
    ) {
      hits.push(pid)
    }
  }
  return [...new Set(hits)]
}

function killUnix(pids) {
  for (const pid of pids) {
    try {
      process.kill(pid, 'SIGTERM')
    } catch {
      /* ignore */
    }
  }
  if (pids.length === 0) return
  spawnSync('sleep', ['0.6'])
  for (const pid of pids) {
    try {
      process.kill(pid, 0)
      process.kill(pid, 'SIGKILL')
    } catch {
      /* gone */
    }
  }
}

function listPidsWin() {
  const r = spawnSync('wmic', ['process', 'get', 'ProcessId,CommandLine', '/FORMAT:CSV'], {
    encoding: 'utf8',
    shell: true
  })
  if (r.status !== 0) return []
  const hits = []
  for (const line of r.stdout.split('\n')) {
    if (!line.includes('electron') && !line.toLowerCase().includes('lanpm')) continue
    const parts = line.split(',')
    const pid = Number(parts[parts.length - 1]?.trim())
    if (!Number.isFinite(pid) || pid === selfPid) continue
    hits.push(pid)
  }
  return [...new Set(hits)]
}

function killWin(pids) {
  for (const pid of pids) {
    spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore', shell: true })
  }
}

const pids = process.platform === 'win32' ? listPidsWin() : listPidsUnix()
if (pids.length === 0) {
  console.log('[lanpm] stop: no other LanPM/Electron processes found')
  process.exit(0)
}
console.log(`[lanpm] stop: terminating PIDs ${pids.join(', ')}`)
if (process.platform === 'win32') killWin(pids)
else killUnix(pids)
console.log('[lanpm] stop: done')
