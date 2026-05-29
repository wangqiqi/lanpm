import enUS from './locales/en-US'
import zhCN from './locales/zh-CN'
import type { LocaleId, MessageKey, TranslateParams } from './types'

export type { LocaleId, MessageKey, TranslateParams }

export const MESSAGES: Record<LocaleId, Record<MessageKey, string>> = {
  'zh-CN': zhCN,
  'en-US': enUS
}

export function translate(
  locale: LocaleId,
  key: MessageKey,
  params?: TranslateParams
): string {
  const bundle = MESSAGES[locale] ?? MESSAGES['zh-CN']
  let text = bundle[key] ?? MESSAGES['zh-CN'][key] ?? key
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{${name}}`, String(value))
    }
  }
  return text
}
