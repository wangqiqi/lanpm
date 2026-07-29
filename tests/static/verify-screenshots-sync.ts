/**
 * SPRINT-13 — README screenshot sync scripts.
 * Run: npm run verify:screenshots-sync
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
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

console.log('verify:screenshots-sync OK')
