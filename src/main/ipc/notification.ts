import { ipcMain } from 'electron'
import { showDesktopNotification } from '../desktopNotification'

export function registerNotificationIpc(): void {
  ipcMain.handle('notification:show', (_event, title: string, body: string) => {
    if (typeof title !== 'string' || typeof body !== 'string') return
    showDesktopNotification(title, body)
  })
}
