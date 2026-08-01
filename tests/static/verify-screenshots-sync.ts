/**
 * SPRINT-13 — README screenshot sync scripts.
 * Run: npm run verify:screenshots-sync
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['screenshots:capture'], 'missing screenshots:capture')
assert.ok(pkg.scripts?.['screenshots:sync-readme'], 'missing screenshots:sync-readme')

const syncSrc = readFileSync(join(root, 'scripts/sync-readme-screenshots.mjs'), 'utf8')
assert.match(syncSrc, /light_chat\.png/, 'sync map must include chat')
assert.match(syncSrc, /light_calendar\.png/, 'sync map must include calendar')
assert.match(syncSrc, /light_whiteboard\.png/, 'sync map must include whiteboard')
assert.match(syncSrc, /light_cockpit\.png/, 'sync map must include cockpit')

const captureSrc = readFileSync(join(root, 'scripts/screenshots-capture.mjs'), 'utf8')
assert.match(captureSrc, /baselines\/light/, 'screenshots:capture must write light baselines')
assert.match(captureSrc, /baselines\/dark/, 'screenshots:capture must write dark baselines')

const docsScreenshots = readFileSync(join(root, 'docs/screenshots/README.md'), 'utf8')
assert.match(
  docsScreenshots,
  /COLLAB_DRAWER|协作抽屉/,
  'docs/screenshots must document collaboration drawer captures (TASK-1224)'
)

console.log('verify:screenshots-sync OK')
