/**
 * TASK-846 — Meeting plugin host sprint guards.
 * Run: npm run verify:meeting-plugin
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'
import { parsePluginManifest } from '../../src/shared/plugin/validateManifest.ts'
import { PLUGIN_CAPABILITY_IDS } from '../../src/shared/plugin/types.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const mediaCaps = [
  'media.signal.send',
  'media.signal.poll',
  'media.captureDesktop',
  'media.room.state',
  'media.livekit.createToken'
] as const

for (const cap of mediaCaps) {
  assert.ok(PLUGIN_CAPABILITY_IDS.includes(cap), `PLUGIN_CAPABILITY_IDS missing ${cap}`)
}

const meetingManifest = JSON.parse(
  readFileSync(join(root, 'plugins/lanpm.meeting/plugin.json'), 'utf8')
)
const parsed = parsePluginManifest(meetingManifest)
assert.equal(parsed?.id, 'lanpm.meeting')
assert.ok(parsed?.slots.includes('chat.toolbar.media'))

assert.ok(existsSync(join(root, 'src/renderer/src/plugin/builtins/MeetingStub.tsx')))

const registry = readFileSync(join(root, 'src/renderer/src/plugin/registry.ts'), 'utf8')
assert.match(registry, /lanpm\.meeting.*MeetingStub/)

const proxy = readFileSync(join(root, 'src/main/plugin/capabilityProxy.ts'), 'utf8')
for (const cap of mediaCaps) {
  assert.match(proxy, new RegExp(`case '${cap.replace('.', '\\.')}':`))
}

const chatView = readFileSync(join(root, 'src/renderer/src/features/chat/ChatView.tsx'), 'utf8')
assert.match(chatView, /ChatVoiceMediaPanel/)
assert.ok(!chatView.includes('voiceComingSoon'), 'ChatView must not hardcode voiceComingSoon')

const voicePanel = readFileSync(
  join(root, 'src/renderer/src/features/chat/ChatVoiceMediaPanel.tsx'),
  'utf8'
)
assert.match(voicePanel, /chat-voice-hold-btn/)
assert.doesNotMatch(voicePanel, /zone="toolbar"/, 'ChatVoiceMediaPanel must not host toolbar zone')

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:meeting-plugin'], 'missing verify:meeting-plugin script')

const deps = { ...pkg.dependencies, ...pkg.devDependencies }
for (const name of Object.keys(deps ?? {})) {
  assert.ok(!/^@livekit\//.test(name) && !name.includes('jitsi'), `meeting SDK must not be core dep: ${name}`)
}

console.log('verify:meeting-plugin OK')
