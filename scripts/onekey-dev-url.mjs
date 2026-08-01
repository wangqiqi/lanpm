#!/usr/bin/env node
/**
 * 解析 / 等待 LanPM dev 实际 Vite URL（端口避让后可能非 5173）。
 * 用法:
 *   node scripts/onekey-dev-url.mjs wait [--timeout=45]
 *   node scripts/onekey-dev-url.mjs read
 *   node scripts/onekey-dev-url.mjs clear
 */
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const runDir = path.join(root, '.lanpm')
const logFile = path.join(runDir, 'dev.log')
const urlFile = path.join(runDir, 'dev.url')
const portFile = path.join(runDir, 'dev.port')

const PORT_MIN = 5173
const PORT_MAX = 5299

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function parseUrlFromText(text) {
  const re = /https?:\/\/localhost:(\d+)\/?/gi
  let match
  let last = null
  while ((match = re.exec(text)) !== null) {
    last = `http://localhost:${match[1]}`
  }
  return last
}

function parseUrlFromLog() {
  if (!existsSync(logFile)) return null
  try {
    return parseUrlFromText(readFileSync(logFile, 'utf8'))
  } catch {
    return null
  }
}

function lanpmVitePids() {
  const pids = new Set()
  try {
    if (process.platform === 'win32') {
      const out = execSync(
        'wmic process where "Name=\'node.exe\' and CommandLine like \'%electron-vite%\' and CommandLine like \'%lanpm%\'" get ProcessId',
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
      )
      for (const line of out.split(/\r?\n/)) {
        const pid = Number(line.trim())
        if (Number.isFinite(pid) && pid > 0) pids.add(pid)
      }
      return pids
    }
    const out = execSync('pgrep -af electron-vite', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    })
    for (const line of out.split(/\r?\n/)) {
      if (!line.includes(root)) continue
      const pid = Number(line.trim().split(/\s+/)[0])
      if (Number.isFinite(pid) && pid > 0) pids.add(pid)
    }
  } catch {
    // no matching process
  }
  return pids
}

function portOwnedByLanpm(port) {
  const pids = lanpmVitePids()
  if (pids.size === 0) return false

  try {
    if (process.platform === 'win32') {
      const out = execSync(`netstat -ano | findstr ":${port} " | findstr LISTENING`, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore']
      })
      for (const line of out.split(/\r?\n/)) {
        const pid = Number(line.trim().split(/\s+/).pop())
        if (pids.has(pid)) return true
      }
      return false
    }

    const out = execSync(`lsof -iTCP:${port} -sTCP:LISTEN -n -P`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    })
    for (const line of out.split(/\r?\n/).slice(1)) {
      const pid = Number(line.trim().split(/\s+/)[1])
      if (pids.has(pid)) return true
    }
    // 子进程监听：命令行含项目路径
    if (out.includes(root)) return true
  } catch {
    return false
  }
  return false
}

function detectUrlFromPorts() {
  for (let port = PORT_MIN; port <= PORT_MAX; port += 1) {
    if (portOwnedByLanpm(port)) return `http://localhost:${port}`
  }
  return null
}

function resolveDevUrl() {
  return parseUrlFromLog() ?? detectUrlFromPorts()
}

function saveDevUrl(url) {
  if (!url) return
  mkdirSync(runDir, { recursive: true })
  const port = url.match(/:(\d+)$/)?.[1]
  writeFileSync(urlFile, `${url}\n`, 'utf8')
  if (port) writeFileSync(portFile, `${port}\n`, 'utf8')
}

function readSavedUrl() {
  if (!existsSync(urlFile)) return null
  const url = readFileSync(urlFile, 'utf8').trim()
  return url || null
}

function clearDevUrl() {
  for (const f of [urlFile, portFile]) {
    try {
      rmSync(f, { force: true })
    } catch {
      // ignore
    }
  }
}

async function waitForDevUrl(timeoutSec = 45) {
  const deadline = Date.now() + timeoutSec * 1000
  while (Date.now() < deadline) {
    const url = resolveDevUrl()
    if (url) {
      saveDevUrl(url)
      return url
    }
    await sleep(500)
  }
  const fallback = detectUrlFromPorts()
  if (fallback) {
    saveDevUrl(fallback)
    return fallback
  }
  return null
}

const cmd = process.argv[2] ?? 'read'
const timeoutArg = process.argv.find((a) => a.startsWith('--timeout='))
const timeoutSec = timeoutArg ? Number(timeoutArg.split('=')[1]) : 45

if (cmd === 'clear') {
  clearDevUrl()
  process.exit(0)
}

if (cmd === 'wait') {
  const url = await waitForDevUrl(Number.isFinite(timeoutSec) ? timeoutSec : 45)
  if (!url) {
    process.stderr.write('[onekey-dev-url] timeout: Vite URL not found in log\n')
    process.exit(1)
  }
  process.stdout.write(`${url}\n`)
  process.exit(0)
}

if (cmd === 'read') {
  const url = readSavedUrl() ?? resolveDevUrl()
  if (url) saveDevUrl(url)
  if (!url) process.exit(1)
  process.stdout.write(`${url}\n`)
  process.exit(0)
}

process.stderr.write(`Usage: node scripts/onekey-dev-url.mjs <wait|read|clear>\n`)
process.exit(1)
