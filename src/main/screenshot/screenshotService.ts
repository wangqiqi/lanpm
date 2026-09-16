import { app, BrowserWindow } from 'electron'
import { throwLanpm } from '../../shared/errors/lanpmError'
import { mkdir, unlink, writeFile } from 'fs/promises'
import { join } from 'path'
import { sendFileMessage } from '../chat/chatService'
import { getMainWindow, LANPM_MAIN_WINDOW_TITLE } from '../mainWindow'
import { getDatabase } from '../storage'
import type { ChatMessage } from '../../shared/chat/types'

/** Lazy-loaded; electron-screenshots is heavy and not needed before first capture. */
type ScreenshotsApi = {
  $win?: BrowserWindow
  on: (event: string, listener: (...args: unknown[]) => void) => void
  startCapture: () => Promise<void>
  endCapture: () => Promise<void>
}

let screenshots: ScreenshotsApi | null = null
let initPromise: Promise<void> | null = null

type PendingCapture = {
  groupId: string
  resolve: (msg: ChatMessage | null) => void
  reject: (err: Error) => void
}

let pending: PendingCapture | null = null
const hiddenWindows: BrowserWindow[] = []

/** 主应用窗口（排除截图全屏 overlay） */
function getLanpmAppWindows(): BrowserWindow[] {
  return BrowserWindow.getAllWindows().filter((w) => {
    if (w.isDestroyed()) return false
    if (screenshots?.$win && w.id === screenshots.$win.id) return false
    return w.getTitle() === LANPM_MAIN_WINDOW_TITLE
  })
}

function hideAppWindows(): void {
  hiddenWindows.length = 0
  for (const w of getLanpmAppWindows()) {
    if (w.isVisible()) {
      hiddenWindows.push(w)
      w.hide()
    }
  }
}

function lowerScreenshotOverlay(): void {
  const win = screenshots?.$win
  if (!win || win.isDestroyed()) return
  win.setKiosk(false)
  win.setAlwaysOnTop(false)
}

function showAppWindows(): void {
  for (const w of hiddenWindows) {
    if (!w.isDestroyed()) {
      w.show()
    }
  }
  hiddenWindows.length = 0
  lowerScreenshotOverlay()
  const main = getMainWindow()
  if (main && !main.isDestroyed()) {
    main.focus()
    main.moveTop()
  }
}

function clearPending(resolveNull = false): void {
  if (!pending) return
  const p = pending
  pending = null
  showAppWindows()
  if (resolveNull) {
    p.resolve(null)
  }
}

const SCREENSHOT_LANG = {
  magnifier_position_label: '坐标',
  operation_ok_title: '确定',
  operation_cancel_title: '取消',
  operation_save_title: '保存',
  operation_redo_title: '重做',
  operation_undo_title: '撤销',
  operation_mosaic_title: '马赛克',
  operation_text_title: '文本',
  operation_brush_title: '画笔',
  operation_arrow_title: '箭头',
  operation_ellipse_title: '椭圆',
  operation_rectangle_title: '矩形'
} as const

async function ensureScreenshotService(): Promise<void> {
  if (screenshots) return
  if (!initPromise) {
    initPromise = (async () => {
      const { default: Screenshots } = await import('electron-screenshots')
      const instance = new Screenshots({
        singleWindow: true,
        lang: { ...SCREENSHOT_LANG }
      }) as ScreenshotsApi

      instance.on('ok', (...args: unknown[]) => {
        const buffer = args[1]
        if (!Buffer.isBuffer(buffer)) return
        void (async () => {
          if (!pending) return
          const { groupId, resolve, reject } = pending
          pending = null
          showAppWindows()
          try {
            // Prefer userData (stable, app-owned) over OS /tmp — avoid cluttering system temp
            const shotDir = join(app.getPath('userData'), 'tmp')
            await mkdir(shotDir, { recursive: true })
            const filePath = join(shotDir, `lanpm-screenshot-${Date.now()}.png`)
            await writeFile(filePath, buffer)
            const msg = await sendFileMessage(getDatabase(), groupId, filePath)
            // Best-effort: file may already be copied into files/; ignore if still needed
            await unlink(filePath).catch(() => undefined)
            resolve(msg)
          } catch (err) {
            reject(err instanceof Error ? err : new Error(String(err)))
          }
        })()
      })

      instance.on('cancel', () => {
        clearPending(true)
      })

      screenshots = instance
    })().catch((err: unknown) => {
      initPromise = null
      throw err
    })
  }
  await initPromise
}

/** Prefetch after first paint; capture path also awaits this. */
export function initScreenshotService(): void {
  void ensureScreenshotService().catch((err: unknown) => {
    console.error('[lanpm] screenshot module failed to load:', err)
  })
}

export async function captureAndSendScreenshot(groupId: string): Promise<ChatMessage | null> {
  try {
    await ensureScreenshotService()
  } catch {
    throwLanpm('err.screenshotNotReady')
  }
  if (!screenshots) {
    throwLanpm('err.screenshotNotReady')
  }
  if (pending) {
    throwLanpm('err.screenshotInProgress')
  }

  return new Promise((resolve, reject) => {
    pending = { groupId, resolve, reject }
    hideAppWindows()
    screenshots!
      .startCapture()
      .catch((err: unknown) => {
        pending = null
        showAppWindows()
        reject(err instanceof Error ? err : new Error(String(err)))
      })
  })
}

export function shutdownScreenshotService(): void {
  if (pending) {
    pending.reject(new Error('应用退出，截图已取消'))
    pending = null
  }
  showAppWindows()
  if (screenshots) {
    lowerScreenshotOverlay()
    void screenshots.endCapture()
  }
}
