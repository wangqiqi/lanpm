import { translate, type LocaleId, type MessageKey } from '@renderer/i18n/messages'

const LOCALE_KEY = 'locale'

function stubLocale(): LocaleId {
  const raw = localStorage.getItem(LOCALE_KEY)
  return raw === 'en-US' ? 'en-US' : 'zh-CN'
}

/** 浏览器开发桩错误文案（I18N-06 / UX-I-07） */
export function stubT(key: MessageKey): string {
  return translate(stubLocale(), key)
}

export function stubError(key: MessageKey): Error {
  return new Error(key)
}
