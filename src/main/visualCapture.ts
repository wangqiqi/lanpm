import { randomUUID } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { app, BrowserWindow } from 'electron'
import { TASK_PUSH_CHANNEL } from '../shared/task/channels'
import { completeSetup, getSetupStatus } from './identity/setup'
import { ensureSeedGroups } from './group/groupService'
import { getDatabase } from './storage'
import { insertTask, listTasksByGroup } from './storage/repositories/taskRepository'
import type { TaskPriority, TaskStatus } from '../shared/task/types'

const GROUP_ID = 'demo-project'

const APP_PAGES = [
  { slug: 'chat', hash: `/g/${GROUP_ID}/chat` },
  { slug: 'board', hash: `/g/${GROUP_ID}/board` },
  { slug: 'tree', hash: `/g/${GROUP_ID}/tree` },
  { slug: 'gantt', hash: `/g/${GROUP_ID}/gantt` },
  { slug: 'calendar', hash: `/g/${GROUP_ID}/calendar` },
  { slug: 'whiteboard', hash: `/g/${GROUP_ID}/whiteboard` },
  { slug: 'files', hash: `/g/${GROUP_ID}/files` },
  { slug: 'cockpit', hash: '/cockpit' }
] as const

const THEMES = ['light', 'dark'] as const

/** 与 global.module.css --lanpm-bg 一致；无头 capturePage 透明区否则会呈黑底 */
const THEME_WINDOW_BG: Record<(typeof THEMES)[number], string> = {
  light: '#f5f5f7',
  dark: '#000000'
}

const rendererIndexHtml = join(
  dirname(fileURLToPath(import.meta.url)),
  '../renderer/index.html'
)

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function themedPageUrl(theme: (typeof THEMES)[number], hashPath: string): string {
  const hash = hashPath.startsWith('#') ? hashPath : `#${hashPath}`
  return `file://${rendererIndexHtml}?theme=${theme}${hash}`
}

/** file:// 二次导航可能不重新执行 main.tsx，需显式写入 dataset */
async function applyTheme(win: BrowserWindow, theme: (typeof THEMES)[number]): Promise<void> {
  await win.webContents.executeJavaScript(`
    (function() {
      const theme = ${JSON.stringify(theme)};
      localStorage.setItem('theme', theme);
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
      window.dispatchEvent(new CustomEvent('lanpm-visual-theme', { detail: theme }));
    })()
  `)
  await wait(200)
}

async function waitForHealthyUi(win: BrowserWindow, timeoutMs = 25_000): Promise<void> {
  /** 隐藏窗口时 rAF 可能永不触发，用 setTimeout 轮询 */
  await win.webContents.executeJavaScript(`
    new Promise((resolve, reject) => {
      const deadline = Date.now() + ${timeoutMs}
      const tick = () => {
        const root = document.getElementById('root')
        const fatal = document.querySelector('pre.lanpm-fatal')
        const text = root?.innerText ?? ''
        if (fatal || /TypeError:|is not a function/.test(text)) {
          return reject(new Error((fatal?.textContent ?? text).slice(0, 240)))
        }
        const booting = /加载|Loading/i.test(text) && !document.querySelector('nav')
        const hasChrome =
          !!document.querySelector('nav') ||
          !!document.querySelector('header') ||
          text.includes('欢迎')
        if (root && root.childElementCount > 0 && !booting && hasChrome) {
          return resolve(true)
        }
        if (Date.now() > deadline) return reject(new Error('UI not ready: ' + text.slice(0, 80)))
        setTimeout(tick, 120)
      }
      tick()
    })
  `)
}

function loadUrl(win: BrowserWindow, url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`load timeout: ${url}`)), 60_000)
    win.webContents.once('did-finish-load', () => {
      clearTimeout(timer)
      resolve()
    })
    void win.loadURL(url).catch((err) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}

async function navigateHash(win: BrowserWindow, hashPath: string): Promise<void> {
  const hash = hashPath.startsWith('#') ? hashPath : `#${hashPath}`
  await win.webContents.executeJavaScript(`
    (function() {
      const next = ${JSON.stringify(hash)}
      if (window.location.hash !== next) window.location.hash = next
    })()
  `)
  await wait(hashPath.includes('gantt') ? 2_200 : 800)
  await waitForHealthyUi(win)
}

function broadcastTasksChanged(groupId: string): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(TASK_PUSH_CHANNEL, groupId)
  }
}

async function waitForSeededTaskChrome(win: BrowserWindow, marker: string): Promise<void> {
  await win.webContents.executeJavaScript(`
    new Promise((resolve, reject) => {
      const marker = ${JSON.stringify(marker)}
      const deadline = Date.now() + 35_000
      const hasMarker = () => {
        const text = document.body?.innerText ?? ''
        if (text.includes(marker)) return true
        for (const el of document.querySelectorAll('[class*="cardTitle"], [data-task-title]')) {
          if ((el.textContent ?? '').includes(marker)) return true
        }
        return false
      }
      const tick = () => {
        if (hasMarker()) return resolve(true)
        if (Date.now() > deadline) {
          return reject(new Error('seed task not visible: ' + marker))
        }
        setTimeout(tick, 250)
      }
      tick()
    })
  `)
}

async function expandGanttViewport(win: BrowserWindow): Promise<void> {
  await win.webContents.executeJavaScript(`
    (function () {
      const wrap = document.querySelector('[data-lanpm-visual="gantt-chart"]')
      if (!wrap) return
      const root = wrap.closest('[class*="root"]') ?? wrap.parentElement
      if (root instanceof HTMLElement) {
        root.style.minHeight = '820px'
        root.style.height = '820px'
      }
      if (wrap instanceof HTMLElement) {
        wrap.style.minHeight = '720px'
        wrap.style.height = '720px'
      }
      window.dispatchEvent(new Event('resize'))
    })()
  `)
  await wait(900)
}

/** 日历网格也有大量 rect；按行去重统计 gantt-task-react 任务条（宽≥12px） */
async function countGanttTaskBars(win: BrowserWindow): Promise<number> {
  return win.webContents.executeJavaScript(`
    (function () {
      const wrap = document.querySelector('[data-lanpm-visual="gantt-chart"]')
      if (!wrap) return 0
      const rowTops = new Set()
      for (const el of wrap.querySelectorAll('.bar')) {
        const r = el.getBoundingClientRect()
        if (r.width >= 12 && r.height >= 4) rowTops.add(Math.round(r.y))
      }
      return rowTops.size
    })()
  `)
}

const MIN_GANTT_TASK_BAR_ROWS = 1

async function waitForGanttTaskBars(
  win: BrowserWindow,
  minBars = MIN_GANTT_TASK_BAR_ROWS
): Promise<number> {
  const deadline = Date.now() + 45_000
  while (Date.now() < deadline) {
    const n = await countGanttTaskBars(win)
    if (n >= minBars) return n
    await wait(300)
  }
  const last = await countGanttTaskBars(win)
  throw new Error(`gantt task bars not painted (row count=${last}, need ≥${minBars})`)
}

const VISUAL_CAPTURE_MARKER = '截图·设计评审'

function seedVisualCaptureTasks(db: ReturnType<typeof getDatabase>): void {
  const status = getSetupStatus(db)
  if (!status.configured || !status.user) return

  const existing = listTasksByGroup(db, GROUP_ID)
  // mock 目录任务已有排期时旧逻辑会整段跳过，导致看板/甘特等不到截图专用种子
  if (existing.some((t) => t.title === VISUAL_CAPTURE_MARKER)) return

  const userId = status.user.userId
  const ts = new Date().toISOString()
  const today = new Date()
  const ymd = (d: Date) => d.toISOString().slice(0, 10)
  const start = new Date(today)
  start.setDate(today.getDate() - 2)
  const endA = new Date(today)
  endA.setDate(today.getDate() + 12)
  const endB = new Date(today)
  endB.setDate(today.getDate() + 22)

  const marker = VISUAL_CAPTURE_MARKER
  const rows: {
    title: string
    status: TaskStatus
    priority: TaskPriority
    startDate: string
    endDate: string
    progressPercent: number
    sortOrder: number
  }[] = [
    {
      title: marker,
      status: 'doing',
      priority: 'high',
      startDate: ymd(start),
      endDate: ymd(endA),
      progressPercent: 40,
      sortOrder: 0
    },
    {
      title: '截图·接口联调',
      status: 'todo',
      priority: 'medium',
      startDate: ymd(today),
      endDate: ymd(endB),
      progressPercent: 0,
      sortOrder: 1
    }
  ]

  for (const row of rows) {
    insertTask(db, {
      taskId: randomUUID(),
      groupId: GROUP_ID,
      title: row.title,
      status: row.status,
      priority: row.priority,
      progressPercent: row.progressPercent,
      startDate: row.startDate,
      endDate: row.endDate,
      milestone: false,
      sortOrder: row.sortOrder,
      createdBy: userId,
      createdAt: ts,
      updatedAt: ts
    })
  }
  console.info('[lanpm:visual-capture] seeded', rows.length, 'tasks for gantt/board')
}

async function flushPaint(win: BrowserWindow): Promise<void> {
  await win.webContents.executeJavaScript(`
    new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve(true)))
    })
  `)
}

async function capture(
  win: BrowserWindow,
  outDir: string,
  fileName: string,
  theme: (typeof THEMES)[number],
  opts?: { waitForText?: string; waitForGanttBars?: boolean }
): Promise<number | undefined> {
  await waitForHealthyUi(win)
  if (opts?.waitForText) await waitForSeededTaskChrome(win, opts.waitForText)
  let ganttBars: number | undefined
  if (opts?.waitForGanttBars) {
    await expandGanttViewport(win)
    ganttBars = await waitForGanttTaskBars(win)
    console.info(`[lanpm:visual-capture] gantt task bars ready (${ganttBars})`)
    await wait(1_200)
  }
  win.setBackgroundColor(THEME_WINDOW_BG[theme])
  if (!win.isVisible()) win.show()
  await flushPaint(win)
  await wait(400)
  const image = await win.capturePage()
  if (image.isEmpty()) {
    throw new Error(`empty capture: ${fileName}`)
  }
  writeFileSync(join(outDir, fileName), image.toPNG())
  console.info('[lanpm:visual-capture] wrote', join(outDir, fileName))
  return ganttBars
}

/**
 * AUTO-20 / V-14b：无头截取亮暗主题七页（需 build + LANPM_VISUAL_CAPTURE_DIR）。
 */
export async function runVisualCaptureIfRequested(win: BrowserWindow): Promise<boolean> {
  const outDir = process.env.LANPM_VISUAL_CAPTURE_DIR
  if (!outDir) return false

  mkdirSync(outDir, { recursive: true })
  win.setContentSize(1440, 900)
  win.setBounds({ width: 1440, height: 900 })
  win.webContents.setBackgroundThrottling(false)
  if (!win.isVisible()) win.show()

  const db = getDatabase()
  console.info('[lanpm:visual-capture] waiting for initial UI…')
  await waitForHealthyUi(win)

  if (!getSetupStatus(db).configured) {
    for (const theme of THEMES) {
      await loadUrl(win, themedPageUrl(theme, '#/'))
      await applyTheme(win, theme)
      void (await capture(win, outDir, `${theme}_setup.png`, theme))
    }
    completeSetup(db, { baseName: 'Visual', department: 'QA' })
    ensureSeedGroups(db)
  }
  ensureSeedGroups(db)
  seedVisualCaptureTasks(db)
  broadcastTasksChanged(GROUP_ID)
  await wait(2_000)
  const taskMarker = VISUAL_CAPTURE_MARKER
  const ganttMeta: Record<string, number> = {}

  for (const theme of THEMES) {
    const [first, ...rest] = APP_PAGES
    await loadUrl(win, themedPageUrl(theme, first.hash))
    await applyTheme(win, theme)
    await capture(win, outDir, `${theme}_${first.slug}.png`, theme)
    for (const page of rest) {
      await navigateHash(win, page.hash)
      await applyTheme(win, theme)
      const waitForText =
        page.slug === 'gantt' || page.slug === 'board' ? taskMarker : undefined
      const waitForGanttBars = page.slug === 'gantt'
      const bars = await capture(win, outDir, `${theme}_${page.slug}.png`, theme, {
        waitForText,
        waitForGanttBars
      })
      if (bars !== undefined) ganttMeta[theme] = bars
    }
  }

  writeFileSync(
    join(outDir, 'capture-meta.json'),
    JSON.stringify({ ganttTaskBars: ganttMeta, groupId: GROUP_ID }, null, 2)
  )
  console.info('[lanpm:visual-capture] done →', outDir)
  app.exit(0)
  return true
}
