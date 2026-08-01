import { Notification } from 'electron'
import { resolveAppIconPath } from './appIcon'
import { getMainWindow } from './mainWindow'
import { broadcastToAllWindows } from './utils/broadcast'
import {
  NOTIFICATION_NAVIGATE_CHANNEL,
  type DesktopNotificationOptions
} from '../shared/notification/channels'

function focusMainWindow(): void {
  const win = getMainWindow()
  if (!win || win.isDestroyed()) return
  if (!win.isVisible()) win.show()
  if (win.isMinimized()) win.restore()
  win.focus()
}

/** 主进程桌面通知（Windows 须绝对路径 icon + 正确 AppUserModelID） */
export function showDesktopNotification(
  title: string,
  body: string,
  options?: DesktopNotificationOptions
): void {
  if (!Notification.isSupported()) return

  const icon = resolveAppIconPath()
  const groupId = options?.groupId?.trim()
  const n = new Notification({
    title,
    body: body.slice(0, 250),
    ...(icon ? { icon } : {})
  })

  if (groupId) {
    n.on('click', () => {
      focusMainWindow()
      broadcastToAllWindows(NOTIFICATION_NAVIGATE_CHANNEL, { groupId })
    })
  }

  n.show()
}
