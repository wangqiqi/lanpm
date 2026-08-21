/**
 * Playwright Electron: seed four lists, scroll each, sample rAF frames + long tasks.
 */
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { closeApp, launchMeasured } from './measure-perf-ui.mjs'

/** Keep testIds in sync with src/shared/perf/listScrollMeasure.ts */
const SURFACES = [
  { view: 'chat', testId: 'chat-message-list' },
  { view: 'board', testId: 'board-column-scroll' },
  { view: 'files', testId: 'files-table-scroll' },
  { view: 'gantt', testId: 'gantt-chart-scroll' }
]

function seedLists(root, userDataDir) {
  const r = spawnSync(
    process.execPath,
    [
      join(root, 'scripts/run-electron-node.mjs'),
      '--experimental-strip-types',
      join(root, 'tests/integration/measure-seed-lists.ts')
    ],
    {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, LANPM_MEASURE_USER_DATA: userDataDir }
    }
  )
  if (r.status !== 0) {
    throw new Error(`measure-seed-lists failed: ${r.stderr || r.stdout || r.status}`)
  }
}

function p95(samples) {
  if (samples.length === 0) return null
  const sorted = [...samples].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)
  return sorted[Math.max(0, idx)] ?? null
}

function verdictFromSurfaces(surfaces, frameP95GoMs, longTaskGoMs) {
  for (const s of surfaces) {
    if (!s.scrollable) continue
    if ((s.frameP95Ms ?? 0) >= frameP95GoMs) return 'GO'
    if ((s.longTaskMaxMs ?? 0) >= longTaskGoMs) return 'GO'
  }
  return 'NO-GO'
}

async function measureOne(page, view, testId) {
  const tab = page.locator(`[data-testid="nav-tab-${view}"]`)
  await tab.waitFor({ state: 'visible', timeout: 60_000 })
  await tab.click()
  await page.waitForFunction(
    (v) => document.querySelector(`[data-testid="nav-tab-${v}"]`)?.getAttribute('aria-current') === 'page',
    view,
    { timeout: 30_000 }
  )
  await page.waitForSelector(`[data-testid="${testId}"]`, { timeout: 60_000 })
  if (view === 'board') {
    await page.locator(`[data-testid="${testId}"]`).first().waitFor({ state: 'visible' })
  }
  await page.waitForTimeout(800)

  const raw = await page.evaluate(async ({ testId: id, view: v }) => {
    const nodes = [...document.querySelectorAll(`[data-testid="${id}"]`)]
    const rootEl = v === 'board' ? nodes[0] : nodes[0]
    if (!rootEl) return { scrollable: false, frames: [], longTaskMaxMs: 0, error: 'missing' }

    function pickScroller(root) {
      const candidates = [root, ...root.querySelectorAll('*')]
      for (const n of candidates) {
        if (!(n instanceof HTMLElement)) continue
        const st = getComputedStyle(n)
        const y = st.overflowY === 'auto' || st.overflowY === 'scroll'
        const x = st.overflowX === 'auto' || st.overflowX === 'scroll'
        if (y && n.scrollHeight > n.clientHeight + 8) return { el: n, axis: 'y' }
        if (x && n.scrollWidth > n.clientWidth + 8) return { el: n, axis: 'x' }
      }
      return { el: root, axis: 'y' }
    }

    const { el, axis } = pickScroller(rootEl)
    const max =
      axis === 'x' ? el.scrollWidth - el.clientWidth : el.scrollHeight - el.clientHeight
    const scrollable = max > 8

    const longTasks = []
    let observer = null
    try {
      observer = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) longTasks.push(e.duration)
      })
      observer.observe({ type: 'longtask', buffered: false })
    } catch {
      observer = null
    }

    const frames = []
    let last = performance.now()
    let ticking = true
    function tick(now) {
      frames.push(now - last)
      last = now
      if (ticking) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)

    const steps = 20
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      if (axis === 'x') el.scrollLeft = max * t
      else el.scrollTop = max * t
      await new Promise((r) => requestAnimationFrame(r))
    }

    ticking = false
    await new Promise((r) => requestAnimationFrame(r))
    observer?.disconnect()

    return {
      scrollable,
      axis,
      max,
      frames,
      longTaskMaxMs: longTasks.length ? Math.max(...longTasks) : 0,
      longTaskCount: longTasks.length
    }
  }, { testId, view })

  const frameSamples = (raw.frames ?? []).filter((n) => n > 0 && n < 5_000)
  return {
    view,
    testId,
    scrollable: Boolean(raw.scrollable),
    axis: raw.axis ?? null,
    maxPx: raw.max ?? 0,
    frameP95Ms: p95(frameSamples),
    frameCount: frameSamples.length,
    longTaskMaxMs: raw.longTaskMaxMs ?? 0,
    longTaskCount: raw.longTaskCount ?? 0,
    error: raw.error ?? null
  }
}

export async function runMeasureListScroll(opts) {
  const warmup = await launchMeasured(opts)
  await closeApp(warmup.app)
  seedLists(opts.root, opts.userDataDir)

  const launched = await launchMeasured(opts)
  const { app, page } = launched
  try {
    await page.evaluate(() => {
      window.location.hash = '#/g/demo-project/chat'
    })
    await page.waitForSelector('[data-testid="nav-tab-chat"]', { timeout: 90_000 })

    const surfaces = []
    for (const s of SURFACES) {
      surfaces.push(await measureOne(page, s.view, s.testId))
    }
    return {
      surfaces,
      verdict: verdictFromSurfaces(surfaces, opts.frameP95GoMs, opts.longTaskGoMs)
    }
  } finally {
    await closeApp(app)
  }
}
