export const NOTIFICATION_IPC = {
  show: 'notification:show'
} as const

/** Main → renderer：用户点击桌面通知后导航到群 */
export const NOTIFICATION_NAVIGATE_CHANNEL = 'notification:navigate'

export interface NotificationNavigatePayload {
  groupId: string
}

export interface DesktopNotificationOptions {
  groupId?: string
}
