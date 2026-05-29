import { BrowserWindow } from 'electron'

let mainWindow: BrowserWindow | null = null

export const LANPM_MAIN_WINDOW_TITLE = 'LanPM'

export function setMainWindow(win: BrowserWindow | null): void {
  mainWindow = win
}

export function getMainWindow(): BrowserWindow | null {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return mainWindow
  }
  const found = BrowserWindow.getAllWindows().find(
    (w) => !w.isDestroyed() && w.getTitle() === LANPM_MAIN_WINDOW_TITLE
  )
  return found ?? null
}
