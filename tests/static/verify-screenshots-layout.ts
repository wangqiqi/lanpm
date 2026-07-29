/**
 * SPRINT-12 — docs/screenshots 布局与禁根 snapshot/。
 * Run: npm run verify:screenshots-layout
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

assert.ok(existsSync(join(root, 'docs/screenshots/README.md')), 'docs/screenshots/README.md missing')
assert.ok(
  existsSync(join(root, 'docs/screenshots/baselines/dark/dark_chat.png')),
  'dark baseline chat png missing'
)
assert.ok(
  !existsSync(join(root, 'snapshot')),
  'root snapshot/ must be removed — use docs/screenshots/'
)

const pkg = JSON.parse(
  readFileSync(join(root, 'package.json'), 'utf8') as string
) as { scripts?: Record<string, string> }
assert.ok(pkg.scripts?.['verify:visual-screenshots'], 'missing verify:visual-screenshots')

console.log('verify:screenshots-layout OK')
