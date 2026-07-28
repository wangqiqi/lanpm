import { Notification } from 'electron'
import { resolveAppIconPath } from './appIcon'

/** 主进程桌面通知（Windows 须绝对路径 icon + 正确 AppUserModelID） */
export function showDesktopNotification(title: string, body: string): void {
  if (!Notification.isSupported()) return

  const icon = resolveAppIconPath()
  const n = new Notification({
    title,
    body: body.slice(0, 250),
    ...(icon ? { icon } : {})
  })
  n.show()
}
