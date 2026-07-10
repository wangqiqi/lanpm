/** Main → renderer 用户侧轻提示（toast），非 invoke。 */
export const USER_NOTICE_CHANNEL = 'app:userNotice'

export type UserNoticeLevel = 'warning' | 'error'

export type UserNotice = {
  level: UserNoticeLevel
  /** i18n MessageKey */
  messageKey: string
  /** 可选插值，如 `{ name }` */
  params?: Record<string, string | number>
}
