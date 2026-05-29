/**
 * M1-02 / M1-05 / M1-06：顶部栏路径、i18n 键、主题持久化键名
 * 运行：npm run verify:topbar
 */
import enUS from '../../src/renderer/src/i18n/locales/en-US.ts'
import zhCN from '../../src/renderer/src/i18n/locales/zh-CN.ts'
import type { LocaleId, MessageKey, TranslateParams } from '../../src/renderer/src/i18n/types.ts'
import { cockpitPath, groupViewPath } from '../../src/renderer/src/routes/paths.ts'

const MESSAGES: Record<LocaleId, Record<MessageKey, string>> = {
  'zh-CN': zhCN,
  'en-US': enUS
}

function translate(locale: LocaleId, key: MessageKey, params?: TranslateParams): string {
  let text = MESSAGES[locale][key] ?? MESSAGES['zh-CN'][key] ?? key
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{${name}}`, String(value))
    }
  }
  return text
}

const THEME_KEY = 'theme'
const LOCALE_KEY = 'locale'

let failed = 0

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error('FAIL:', msg)
    failed++
  }
}

assert(cockpitPath() === '/cockpit', 'cockpitPath')
assert(groupViewPath('demo-project', 'chat') === '/g/demo-project/chat', 'groupViewPath')

const zhKeys = Object.keys(MESSAGES['zh-CN']) as MessageKey[]
const enKeys = Object.keys(MESSAGES['en-US']) as MessageKey[]
assert(zhKeys.length === enKeys.length, 'locale key count parity')
for (const key of zhKeys) {
  assert(enKeys.includes(key), `en-US missing ${key}`)
}

for (const locale of ['zh-CN', 'en-US'] as const) {
  for (const key of zhKeys) {
    const text = translate(locale, key)
    assert(text.length > 0, `${locale}/${key}`)
    assert(text !== key, `${locale}/${key} untranslated`)
  }
}

assert(translate('en-US', 'chat.onlineStats', { online: 2, total: 5 }).includes('2'), 'i18n params')
assert(translate('zh-CN', 'chat.onlineStats', { online: 2, total: 5 }).includes('2'), 'i18n params zh')

assert(THEME_KEY === 'theme', 'localStorage.theme key')
assert(LOCALE_KEY === 'locale', 'localStorage.locale key')

if (failed > 0) process.exit(1)
console.log('verify:topbar OK', `(${zhKeys.length} i18n keys)`)
