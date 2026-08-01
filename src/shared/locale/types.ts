export type AppLocale = 'zh-CN' | 'en-US'

export const DEFAULT_APP_LOCALE: AppLocale = 'zh-CN'

export const LOCALE_FILE_NAME = 'locale.json'

export function isAppLocale(value: unknown): value is AppLocale {
  return value === 'zh-CN' || value === 'en-US'
}
