#!/usr/bin/env node
/**
 * LanPM onekey 预检与异常诊断（三端 onekey_run.* 共用）
 *
 *   node scripts/onekey-preflight.mjs [--fix] [--quiet]
 *   node scripts/onekey-preflight.mjs --diagnose-log <path>
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/** 缺任一即无法 dev；主进程 external + 常见 Vite 预构建失败包 */
const CRITICAL_PACKAGES = [
  'yjs',
  'better-sqlite3',
  'electron',
  'electron-vite',
  '@fullcalendar/react',
  '@excalidraw/excalidraw',
  'pinyin-pro'
]

const args = process.argv.slice(2)
const quiet = args.includes('--quiet')
const autoFix = args.includes('--fix')
const diagnoseIdx = args.indexOf('--diagnose-log')
const diagnoseLog = diagnoseIdx >= 0 ? args[diagnoseIdx + 1] : null

function say(level, msg) {
  if (quiet && level === 'info') return
  const prefix = '[lanpm] '
  if (level === 'warn') console.warn(`${prefix}${msg}`)
  else if (level === 'err') console.error(`${prefix}${msg}`)
  else console.log(`${prefix}${msg}`)
}

function hint(lines) {
  for (const line of lines) say('warn', `  → ${line}`)
}

function cmdOk(bin, argv) {
  const r = spawnSync(bin, argv, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  })
  return r.status === 0
}

function missingPackages() {
  const missing = []
  if (!existsSync(join(root, 'node_modules'))) {
    return CRITICAL_PACKAGES
  }
  for (const pkg of CRITICAL_PACKAGES) {
    const dir = join(root, 'node_modules', ...pkg.split('/'))
    if (!existsSync(dir)) missing.push(pkg)
  }
  return missing
}

function checkNodeTooling() {
  const issues = []
  for (const bin of ['node', 'npm']) {
    const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [bin], {
      encoding: 'utf8',
      shell: process.platform === 'win32'
    })
    if (r.status !== 0) {
      issues.push(`缺少命令: ${bin}`)
    }
  }
  if (process.env.ELECTRON_RUN_AS_NODE) {
    say('warn', '检测到 ELECTRON_RUN_AS_NODE 已设置，可能导致 Electron 异常')
    hint(['onekey 启动时会自动清除；若手动 npm run dev 请先: unset ELECTRON_RUN_AS_NODE (Unix) 或 set ELECTRON_RUN_AS_NODE= (Windows)'])
  }
  return issues
}

function checkNodeVersion() {
  const major = Number(process.versions.node.split('.')[0])
  if (!Number.isFinite(major)) return []
  if (major < 20) {
    return [`Node.js 版本偏低 (当前 v${process.versions.node})，建议 Node 20+ / 22 LTS`]
  }
  return []
}

function runEnsureNative() {
  say('info', '检查 native 模块 (better-sqlite3 ↔ Electron) …')
  return cmdOk(process.execPath, [join(root, 'scripts/ensure-native-deps.mjs')])
}

function runNpmInstall() {
  say('info', '自动执行 npm install …')
  return cmdOk('npm', ['install'])
}

function preflight() {
  const blockers = []
  const hints = []

  blockers.push(...checkNodeTooling())
  blockers.push(...checkNodeVersion())

  const missing = missingPackages()
  if (missing.length > 0) {
    if (missing.length === CRITICAL_PACKAGES.length && !existsSync(join(root, 'node_modules'))) {
      blockers.push('node_modules 不存在')
    } else {
      blockers.push(`依赖未安装: ${missing.join(', ')}`)
    }
    hints.push('onekey_run.* install  或  npm install')
    hints.push('深度清理后需重新 install')

    if (autoFix) {
      if (!runNpmInstall()) {
        say('err', 'npm install 失败')
        hint(['检查网络与 npm 源', 'Windows 可尝试以管理员打开终端后重试'])
        return 2
      }
      const still = missingPackages()
      if (still.length > 0) {
        say('err', `安装后仍缺失: ${still.join(', ')}`)
        return 2
      }
      say('info', '依赖已补齐')
    }
  }

  if (blockers.length > 0 && !autoFix) {
    for (const issue of blockers) say('err', issue)
    if (hints.length) {
      say('warn', '建议:')
      hint(hints)
    }
    return 1
  }

  if (!existsSync(join(root, 'node_modules', 'better-sqlite3'))) {
    return blockers.length ? 1 : 0
  }

  if (!runEnsureNative()) {
    say('err', 'native 模块与 Electron ABI 未对齐')
    hint(['npm run rebuild:native', 'onekey_run.* rebuild'])
    if (autoFix) {
      say('info', '尝试 rebuild:native …')
      if (cmdOk('npm', ['run', 'rebuild:native'])) return 0
      return 2
    }
    return 1
  }

  if (!quiet) say('info', '预检通过')
  return 0
}

const LOG_HINTS = [
  {
    test: /ERR_MODULE_NOT_FOUND[\s\S]*Cannot find package '([^']+)'/,
    title: (m) => `缺少 npm 包: ${m[1]}`,
    hints: () => ['onekey_run.* install', 'npm install']
  },
  {
    test: /NODE_MODULE_VERSION|better_sqlite3/,
    title: () => 'better-sqlite3 与 Electron Node ABI 不匹配',
    hints: () => ['onekey_run.* rebuild', 'npm run ensure:native']
  },
  {
    test: /SqliteError: no such table/,
    title: (m) => `数据库结构异常: ${m[0]}`,
    hints: () => [
      '请更新到最新代码后重启',
      '若仍失败可备份后删除 %APPDATA%\\lanpm 用户数据目录（会丢失本地数据）'
    ]
  },
  {
    test: /startup failed/i,
    title: () => '主进程启动失败',
    hints: () => ['onekey_run.* logs 查看完整日志', 'onekey_run.* check quick']
  },
  {
    test: /EADDRINUSE|address already in use/i,
    title: () => '开发端口被占用',
    hints: () => ['onekey_run.* stop', '关闭其他 Vite/Electron 实例']
  },
  {
    test: /Could not resolve.*dependencies are imported but could not be resolved/i,
    title: () => '渲染依赖未安装完整',
    hints: () => ['onekey_run.* install', 'npm install']
  }
]

function diagnoseLogFile(path) {
  if (!path || !existsSync(path)) {
    say('warn', `无日志可诊断: ${path ?? '(未指定)'}`)
    return 1
  }
  const text = readFileSync(path, 'utf8')
  const tail = text.split(/\r?\n/).slice(-80).join('\n')
  let matched = false
  for (const rule of LOG_HINTS) {
    const m = tail.match(rule.test)
    if (!m) continue
    matched = true
    say('warn', `诊断: ${rule.title(m)}`)
    hint(rule.hints(m))
  }
  if (!matched) {
    say('warn', '未匹配到已知错误模式')
    hint(['onekey_run.* logs', 'onekey_run.* check quick', '将日志末尾发给维护者'])
  }
  return matched ? 0 : 1
}

if (diagnoseLog) {
  process.exit(diagnoseLogFile(diagnoseLog))
}

process.exit(preflight())
