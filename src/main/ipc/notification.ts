import { ipcMain } from 'electron'
import { NOTIFICATION_IPC } from '../../shared/notification/channels'
import { showDesktopNotification } from '../desktopNotification'

export function registerNotificationIpc(): void {
  ipcMain.handle(NOTIFICATION_IPC.show, (_event, title: string, body: string) => {
    if (typeof title !== 'string' || typeof body !== 'string') return
    showDesktopNotification(title, body)
  })
}
