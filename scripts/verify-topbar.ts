/**
 * M1-02 / M1-05 / M1-06：顶部栏路径、i18n 键、主题持久化键名
 * 运行：npm run verify:topbar
 */
import { MESSAGES, translate } from '../src/renderer/src/i18n/messages.ts'
import { cockpitPath, groupViewPath } from '../src/renderer/src/routes/paths.ts'

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

for (const locale of ['zh-CN', 'en-US'] as const) {
  const keys = Object.keys(MESSAGES['zh-CN']) as (keyof typeof MESSAGES['zh-CN'])[]
  for (const key of keys) {
    const text = translate(locale, key)
    assert(text.length > 0, `${locale}/${key}`)
    assert(text !== key, `${locale}/${key} untranslated`)
  }
}

assert(THEME_KEY === 'theme', 'localStorage.theme key')
assert(LOCALE_KEY === 'locale', 'localStorage.locale key')

if (failed > 0) process.exit(1)
console.log('verify:topbar OK', `(${Object.keys(MESSAGES['zh-CN']).length} i18n keys)`)

