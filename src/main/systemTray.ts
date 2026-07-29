import { app, BrowserWindow, Menu, Tray } from 'electron'
import { resolveAppIconPath, resolveTrayIcon } from './appIcon'
import { getMainWindow } from './mainWindow'

let tray: Tray | null = null
let quitting = false

export function isAppQuitting(): boolean {
  return quitting
}

export function requestAppQuit(): void {
  quitting = true
  tray?.destroy()
  tray = null
  app.quit()
}

/** 关闭主窗口时隐藏到托盘，而非退出进程 */
export function attachCloseToTray(mainWindow: BrowserWindow): void {
  mainWindow.on('close', (event) => {
    if (quitting || visualCaptureMode()) return
    event.preventDefault()
    mainWindow.hide()
  })
}

function visualCaptureMode(): boolean {
  return Boolean(process.env.LANPM_VISUAL_CAPTURE_DIR)
}

function showMainWindow(): void {
  const win = getMainWindow()
  if (!win || win.isDestroyed()) return
  if (!win.isVisible()) win.show()
  if (win.isMinimized()) win.restore()
  win.focus()
}

export function initSystemTray(): boolean {
  if (visualCaptureMode()) return false

  const icon = resolveTrayIcon()
  if (!icon) {
    console.warn('[lanpm] tray icon missing — run npm run build:icons')
    return false
  }

  tray = new Tray(icon)
  tray.setToolTip('LanPM')

  const menu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => showMainWindow()
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => requestAppQuit()
    }
  ])
  tray.setContextMenu(menu)

  tray.on('click', () => showMainWindow())
  tray.on('double-click', () => showMainWindow())

  return true
}

export function hasSystemTray(): boolean {
  return tray !== null
}
