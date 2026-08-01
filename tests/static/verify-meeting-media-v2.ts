/**
 * meeting-media-v2 — mesh share + compact toolbar guards.
 * Run: npm run verify:meeting-media-v2
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const mesh = readFileSync(
  join(root, 'src/renderer/src/plugin/builtins/useMeetingMesh.ts'),
  'utf8'
)
assert.match(mesh, /shareDesktopSource/)
assert.match(mesh, /addTrack/)
assert.match(mesh, /ontrack/)

const toolbar = readFileSync(
  join(root, 'src/renderer/src/plugin/builtins/MeetingToolbar.tsx'),
  'utf8'
)
assert.match(toolbar, /meeting-toolbar-menu/)
assert.match(toolbar, /meeting-mesh-screenshare/)

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:meeting-media-v2'], 'missing verify:meeting-media-v2 script')

console.log('verify:meeting-media-v2 OK')
