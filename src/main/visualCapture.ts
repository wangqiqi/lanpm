import { randomUUID } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { BrowserWindow } from 'electron'
import { app } from 'electron'
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
  { slug: 'files', hash: `/g/${GROUP_ID}/files` },
  { slug: 'cockpit', hash: '/cockpit' }
] as const

const THEMES = ['light', 'dark'] as const

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
    const timer = setTimeout(() => reject(new Error(`load timeout: ${url}`)), 40_000)
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
  await wait(800)
  await waitForHealthyUi(win)
}

async function waitForSeededTaskChrome(win: BrowserWindow, marker: string): Promise<void> {
  await win.webContents.executeJavaScript(`
    new Promise((resolve, reject) => {
      const marker = ${JSON.stringify(marker)}
      const deadline = Date.now() + 20_000
      const tick = () => {
        const text = document.body?.innerText ?? ''
        if (text.includes(marker)) return resolve(true)
        if (Date.now() > deadline) {
          return reject(new Error('seed task not visible: ' + marker))
        }
        setTimeout(tick, 200)
      }
      tick()
    })
  `)
}

function seedVisualCaptureTasks(db: ReturnType<typeof getDatabase>): void {
  const status = getSetupStatus(db)
  if (!status.configured || !status.user) return

  const existing = listTasksByGroup(db, GROUP_ID)
  if (existing.some((t) => t.startDate && t.endDate)) return

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

  const marker = '截图·设计评审'
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

async function capture(
  win: BrowserWindow,
  outDir: string,
  fileName: string,
  opts?: { waitForText?: string }
): Promise<void> {
  await waitForHealthyUi(win)
  if (opts?.waitForText) await waitForSeededTaskChrome(win, opts.waitForText)
  await wait(350)
  if (!win.isVisible()) win.showInactive()
  const image = await win.capturePage()
  if (image.isEmpty()) {
    throw new Error(`empty capture: ${fileName}`)
  }
  writeFileSync(join(outDir, fileName), image.toPNG())
  console.info('[lanpm:visual-capture] wrote', join(outDir, fileName))
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
  win.showInactive()

  const db = getDatabase()
  console.info('[lanpm:visual-capture] waiting for initial UI…')
  await waitForHealthyUi(win)

  if (!getSetupStatus(db).configured) {
    for (const theme of THEMES) {
      await loadUrl(win, themedPageUrl(theme, '#/'))
      await applyTheme(win, theme)
      await capture(win, outDir, `${theme}_setup.png`)
    }
    completeSetup(db, { baseName: 'Visual', department: 'QA' })
    ensureSeedGroups(db)
  }
  seedVisualCaptureTasks(db)
  const taskMarker = '截图·设计评审'

  for (const theme of THEMES) {
    const [first, ...rest] = APP_PAGES
    await loadUrl(win, themedPageUrl(theme, first.hash))
    await applyTheme(win, theme)
    await capture(win, outDir, `${theme}_${first.slug}.png`)
    for (const page of rest) {
      await navigateHash(win, page.hash)
      await applyTheme(win, theme)
      const waitForText =
        page.slug === 'gantt' || page.slug === 'board' ? taskMarker : undefined
      await capture(win, outDir, `${theme}_${page.slug}.png`, { waitForText })
    }
  }

  console.info('[lanpm:visual-capture] done →', outDir)
  app.exit(0)
  return true
}
