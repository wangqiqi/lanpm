/**
 * TASK-4901 — 无头截图 locale / slug 收窄守卫（不启动 Electron）。
 * Run: npm run verify:visual-locale-capture
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const capture = readFileSync(join(root, 'src/main/visualCapture.ts'), 'utf8')
assert.match(capture, /LANPM_VISUAL_LOCALE/, 'visualCapture must honor LANPM_VISUAL_LOCALE')
assert.match(capture, /LANPM_VISUAL_SLUGS/, 'visualCapture must honor LANPM_VISUAL_SLUGS')
assert.match(capture, /applyLocale/, 'visualCapture must apply locale in-session')
assert.match(capture, /Welcome to LanPM/, 'healthy UI wait must accept English setup copy')

const store = readFileSync(join(root, 'src/renderer/src/stores/uiStore.ts'), 'utf8')
assert.match(store, /lanpm-visual-locale/, 'uiStore must listen for lanpm-visual-locale')

const main = readFileSync(join(root, 'src/renderer/src/main.tsx'), 'utf8')
assert.match(main, /applyLocaleQueryParam/, 'renderer bootstrap must apply ?locale=')

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:visual-screenshots-en'], 'missing verify:visual-screenshots-en')
assert.ok(pkg.scripts?.['verify:visual-locale-capture'], 'missing verify:visual-locale-capture')

console.log('verify:visual-locale-capture OK')
