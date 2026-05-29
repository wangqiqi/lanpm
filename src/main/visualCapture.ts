import { mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { BrowserWindow } from 'electron'
import { app } from 'electron'
import { completeSetup, getSetupStatus } from './identity/setup'
import { ensureSeedGroups } from './group/groupService'
import { getDatabase } from './storage'

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

async function waitForHealthyUi(win: BrowserWindow, timeoutMs = 30_000): Promise<void> {
  await win.webContents.executeJavaScript(`
    new Promise((resolve, reject) => {
      const deadline = Date.now() + ${timeoutMs}
      const tick = () => {
        const root = document.getElementById('root')
        const fatal = document.querySelector('pre.lanpm-fatal')
        const text = root?.innerText ?? ''
        if (fatal || /TypeError:|is not a function/.test(text)) {
          return reject(new Error((fatal?.textContent ?? text).slice(0, 200)))
        }
        if (root && root.childElementCount > 0 && !text.includes('LanPM 加载中')) {
          return resolve(true)
        }
        if (Date.now() > deadline) return reject(new Error('UI not ready'))
        requestAnimationFrame(tick)
      }
      tick()
    })
  `)
}

function loadUrl(win: BrowserWindow, url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`load timeout: ${url}`)), 45_000)
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

async function capture(win: BrowserWindow, outDir: string, fileName: string): Promise<void> {
  await waitForHealthyUi(win)
  await wait(600)
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
 * 每页整页 loadURL，避免 hash 懒加载触发 Rolldown CJS 循环依赖。
 */
export async function runVisualCaptureIfRequested(win: BrowserWindow): Promise<boolean> {
  const outDir = process.env.LANPM_VISUAL_CAPTURE_DIR
  if (!outDir) return false

  mkdirSync(outDir, { recursive: true })
  win.setContentSize(1440, 900)
  win.setBounds({ width: 1440, height: 900 })
  win.hide()

  const db = getDatabase()
  await waitForHealthyUi(win)

  if (!getSetupStatus(db).configured) {
    for (const theme of THEMES) {
      await loadUrl(win, themedPageUrl(theme, '#/'))
      await capture(win, outDir, `${theme}_setup.png`)
    }
    completeSetup(db, { baseName: 'Visual', department: 'QA' })
    ensureSeedGroups(db)
  }

  for (const theme of THEMES) {
    for (const page of APP_PAGES) {
      await loadUrl(win, themedPageUrl(theme, page.hash))
      await capture(win, outDir, `${theme}_${page.slug}.png`)
    }
  }

  console.info('[lanpm:visual-capture] done →', outDir)
  app.exit(0)
  return true
}
