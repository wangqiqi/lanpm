/**
 * Playwright Electron slices for measure-perf (TASK-2902+).
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { _electron as electron } from 'playwright'
import { resolveElectronBin } from './resolve-electron-bin.mjs'
import { electronCiChromiumFlags } from './electron-ci-chromium-flags.mjs'

/** Default bottom nav: chat / board / tree (gantt/calendar hidden until Profile → 导航) */
const TABS = ['chat', 'board', 'tree']

function linuxTreeRssMb(pid) {
  if (process.platform !== 'linux' || !pid) return null
  const seen = new Set()
  const stack = [pid]
  let pages = 0
  while (stack.length) {
    const p = stack.pop()
    if (!p || seen.has(p)) continue
    seen.add(p)
    try {
      const statm = readFileSync(`/proc/${p}/statm`, 'utf8').trim().split(/\s+/)
      pages += Number(statm[1] || 0)
    } catch {
      continue
    }
    try {
      const kids = readFileSync(`/proc/${p}/task/${p}/children`, 'utf8').trim()
      for (const k of kids.split(/\s+/).filter(Boolean)) stack.push(Number(k))
    } catch {
      /* no children file */
    }
  }
  const pageSize = 4096
  return Math.round((pages * pageSize) / (1024 * 1024) * 10) / 10
}

async function waitForLanpmWindow(app, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    for (const window of app.windows()) {
      const title = await window.title().catch(() => '')
      if (title.includes('LanPM')) return window
    }
    await new Promise((r) => setTimeout(r, 200))
  }
  return app.firstWindow()
}

export async function launchMeasured(opts) {
  const electronBin = resolveElectronBin()
  if (!electronBin) throw new Error('electron binary missing — run npm install')
  const mainJs = join(opts.root, 'out/main/index.js')
  if (!existsSync(mainJs)) throw new Error('out/main/index.js missing — run npm run build first')
  const env = { ...process.env }
  delete env.ELECTRON_RUN_AS_NODE
  env.LANPM_E2E = '1'
  env.LANPM_MEASURE = '1'
  env.LANPM_USER_DATA = opts.userDataDir
  env.LANPM_NETWORK = env.LANPM_NETWORK || 'stub'
  env.LANPM_E2E_NAME = 'PerfMeasure'
  const t0 = Date.now()
  const app = await electron.launch({
    executablePath: electronBin,
    args: [...electronCiChromiumFlags(), mainJs],
    cwd: opts.root,
    env,
    timeout: 120_000
  })
  const page = await waitForLanpmWindow(app)
  await page.waitForLoadState('load', { timeout: 90_000 }).catch(() => {})
  await page.waitForSelector('[data-testid="topbar-discover"], [data-testid="nav-tab-chat"]', {
    timeout: 120_000
  })
  const coldMs = Date.now() - t0
  return { app, page, coldMs }
}

export async function closeApp(app) {
  const proc = app.process()
  try {
    await Promise.race([
      app.close(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('close timeout')), 15_000)
      })
    ])
  } catch {
    if (proc?.pid) {
      try {
        process.kill(-proc.pid, 'SIGKILL')
      } catch {
        try {
          process.kill(proc.pid, 'SIGKILL')
        } catch {
          /* ignore */
        }
      }
    }
  }
}

function seedChat100(root, userDataDir) {
  const r = spawnSync(
    process.execPath,
    [
      join(root, 'scripts/run-electron-node.mjs'),
      '--experimental-strip-types',
      join(root, 'tests/integration/measure-seed-chat.ts')
    ],
    {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, LANPM_MEASURE_USER_DATA: userDataDir }
    }
  )
  if (r.status !== 0) {
    throw new Error(`measure-seed-chat failed: ${r.stderr || r.stdout || r.status}`)
  }
}

export async function runMeasurePerfUi(opts) {
  const patch = {}
  const samples = []
  let app = null
  let page = null

  const warmup = await launchMeasured(opts)
  await closeApp(warmup.app)

  const runs = opts.cold ? opts.coldRuns : 0
  for (let i = 0; i < runs; i++) {
    const last = i === runs - 1
    const launched = await launchMeasured(opts)
    samples.push(launched.coldMs)
    if (last && (opts.memory || opts.tabs)) {
      app = launched.app
      page = launched.page
    } else {
      await closeApp(launched.app)
    }
  }

  if (opts.cold) {
    patch.coldStartMs = { samples, median: opts.median(samples) }
  }

  if (opts.memory || opts.tabs) {
    if (!app) {
      const launched = await launchMeasured(opts)
      app = launched.app
      page = launched.page
    }
  }

  if (opts.memory && app) {
    await new Promise((r) => setTimeout(r, opts.idleMs))
    patch.rssIdleMb = linuxTreeRssMb(app.process()?.pid)
    await closeApp(app)
    app = null
    page = null
    seedChat100(opts.root, opts.userDataDir)
    const chatLaunch = await launchMeasured(opts)
    app = chatLaunch.app
    page = chatLaunch.page
    await new Promise((r) => setTimeout(r, Math.min(opts.idleMs, 5_000)))
    patch.rssChat100Mb = linuxTreeRssMb(app.process()?.pid)
  }

  if (opts.tabs && page) {
    await page.evaluate(() => {
      window.location.hash = '#/g/demo-project/chat'
    })
    await page.waitForSelector('[data-testid="nav-tab-chat"]', { timeout: 60_000 })
    const tabSamples = []
    for (let i = 0; i < opts.tabRepeats; i++) {
      for (const view of TABS) {
        const tab = page.locator(`[data-testid="nav-tab-${view}"]`)
        if ((await tab.count()) === 0) continue
        const t0 = Date.now()
        await tab.click()
        await page.waitForFunction(
          (v) => document.querySelector(`[data-testid="nav-tab-${v}"]`)?.getAttribute('aria-current') === 'page',
          view,
          { timeout: 30_000 }
        )
        tabSamples.push(Date.now() - t0)
      }
    }
    patch.tabSwitchP95Ms = opts.p95(tabSamples)
    patch.tabSwitchSamples = tabSamples.length
  }

  if (app) await closeApp(app)
  return patch
}
