import {
  BrowserWindow,
  dialog,
  type OpenDialogOptions,
  type SaveDialogOptions
} from 'electron'
import { getMainWindow } from './mainWindow'

const SCREENSHOT_WINDOW_TITLE = 'screenshots'

/** 截图全屏层可能仍 alwaysOnTop，会挡住文件对话框 */
function releaseBlockingOverlays(): void {
  for (const w of BrowserWindow.getAllWindows()) {
    if (w.isDestroyed()) continue
    if (w.getTitle() !== SCREENSHOT_WINDOW_TITLE) continue
    w.setKiosk(false)
    w.setAlwaysOnTop(false)
    if (w.isVisible()) {
      w.hide()
    }
  }
}

export function resolveDialogParent(preferred?: BrowserWindow | null): BrowserWindow | undefined {
  if (preferred && !preferred.isDestroyed()) {
    if (preferred.getTitle() === SCREENSHOT_WINDOW_TITLE) {
      return getMainWindow() ?? undefined
    }
    return preferred
  }

  const focused = BrowserWindow.getFocusedWindow()
  if (
    focused &&
    !focused.isDestroyed() &&
    focused.getTitle() !== SCREENSHOT_WINDOW_TITLE
  ) {
    return focused
  }

  return getMainWindow() ?? undefined
}

function focusDialogParent(parent: BrowserWindow | undefined): void {
  if (!parent || parent.isDestroyed()) return
  if (!parent.isVisible()) {
    parent.show()
  }
  parent.focus()
  parent.moveTop()
}

export async function showOpenDialog(
  parent: BrowserWindow | null | undefined,
  options: OpenDialogOptions
) {
  releaseBlockingOverlays()
  const win = resolveDialogParent(parent)
  focusDialogParent(win)
  return win ? dialog.showOpenDialog(win, options) : dialog.showOpenDialog(options)
}

export async function showSaveDialog(
  parent: BrowserWindow | null | undefined,
  options: SaveDialogOptions
) {
  releaseBlockingOverlays()
  const win = resolveDialogParent(parent)
  focusDialogParent(win)
  return win ? dialog.showSaveDialog(win, options) : dialog.showSaveDialog(options)
}
