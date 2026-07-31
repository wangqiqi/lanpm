/**
 * SPIKE-374–376 — Meeting plugin (`lanpm.meeting`) architecture spike guards.
 * Run: npm run verify:meeting-spike
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const roadmap = readFileSync(join(root, 'docs/06_ROADMAP.md'), 'utf8')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  dependencies?: Record<string, string>
  scripts?: Record<string, string>
}
const pluginTypes = readFileSync(join(root, 'src/shared/plugin/types.ts'), 'utf8')
const chatView = readFileSync(join(root, 'src/renderer/src/features/chat/ChatView.tsx'), 'utf8')

assert.ok(pkg.scripts?.['verify:meeting-spike'], 'missing verify:meeting-spike script')

// SPIKE delivered — docs anchor (no runtime media in core yet)
assert.match(roadmap, /verify:meeting-spike/)
assert.match(roadmap, /SPIKE.*已交付|SPIKE-374|meeting-plugin-spike/i)
assert.match(roadmap, /LiveKit/)
assert.match(roadmap, /mesh/)
assert.match(roadmap, /chat\.toolbar\.media/)
assert.match(roadmap, /meet\.jit\.si|LiveKit Cloud/)
assert.match(roadmap, /禁止/)

// Out of scope for spike: no SFU SDK in core deps
const deps = { ...pkg.dependencies, ...(pkg as { devDependencies?: Record<string, string> }).devDependencies }
for (const name of Object.keys(deps ?? {})) {
  assert.ok(!/^@livekit\//.test(name) && !name.includes('jitsi'), `meeting SDK must not be core dep: ${name}`)
}

// Host extended — media capabilities + voice panel wired to Slot (meeting-plugin-host)
assert.match(pluginTypes, /media\.signal\.send/)
assert.match(pluginTypes, /media\.captureDesktop/)
assert.match(chatView, /ChatVoiceMediaPanel/)
assert.ok(!chatView.includes('voiceComingSoon'), 'voice panel must use plugin slot path')

console.log('verify:meeting-spike OK (docs · no core media deps · meeting host baseline)')
