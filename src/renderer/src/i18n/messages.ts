import enUS from '@renderer/i18n/locales/en-US'
import zhCN from '@renderer/i18n/locales/zh-CN'

export type LocaleId = 'zh-CN' | 'en-US'

export type MessageKey =
  | 'topbar.logo'
  | 'topbar.cockpit'
  | 'topbar.searchPlaceholder'
  | 'search.kindTask'
  | 'search.kindMessage'
  | 'search.loading'
  | 'search.empty'
  | 'topbar.toggleTheme'
  | 'topbar.userFallback'
  | 'topbar.profile'
  | 'topbar.device'
  | 'topbar.apiKey'
  | 'groupType.project'
  | 'groupType.function'
  | 'groupType.anonymous'
  | 'nav.chat'
  | 'nav.board'
  | 'nav.tree'
  | 'nav.gantt'
  | 'nav.files'
  | 'nav.disabled.project'
  | 'nav.disabled.function'
  | 'nav.disabled.anonymous'

export const MESSAGES: Record<LocaleId, Record<MessageKey, string>> = {
  'zh-CN': zhCN,
  'en-US': enUS
}

export function translate(locale: LocaleId, key: MessageKey): string {
  return MESSAGES[locale][key] ?? MESSAGES['zh-CN'][key] ?? key
}
