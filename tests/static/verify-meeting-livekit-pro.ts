/**
 * TASK-888 — Pro LiveKit bypass guards.
 * Run: npm run verify:meeting-livekit-pro
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'
import { parsePluginManifest } from '../../src/shared/plugin/validateManifest.ts'
import { PLUGIN_CAPABILITY_IDS } from '../../src/shared/plugin/types.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

assert.ok(PLUGIN_CAPABILITY_IDS.includes('media.livekit.createToken'))

const meetingManifest = JSON.parse(
  readFileSync(join(root, 'plugins/lanpm.meeting/plugin.json'), 'utf8')
)
const parsed = parsePluginManifest(meetingManifest)
assert.ok(parsed?.capabilities.includes('media.livekit.createToken'))

assert.ok(existsSync(join(root, 'plugins/lanpm.meeting/deploy/docker-compose.yml')))
assert.ok(existsSync(join(root, 'plugins/lanpm.meeting/deploy/livekit.yaml')))
assert.ok(existsSync(join(root, 'plugins/lanpm.meeting/deploy/.env.example')))
assert.ok(existsSync(join(root, 'plugins/lanpm.meeting/README.md')))

const compose = readFileSync(join(root, 'plugins/lanpm.meeting/deploy/docker-compose.yml'), 'utf8')
assert.match(compose, /livekit\/livekit-server/)
assert.ok(!compose.includes('livekit.cloud'), 'compose must not reference LiveKit Cloud')

const shared = readFileSync(join(root, 'src/shared/media/livekitConfig.ts'), 'utf8')
assert.match(shared, /normalizeLiveKitConfig/)
assert.match(shared, /toLiveKitConfigPublic/)

const store = readFileSync(join(root, 'src/main/media/liveKitConfigStore.ts'), 'utf8')
assert.match(store, /meeting-livekit\.json/)

const tokenSvc = readFileSync(join(root, 'src/main/media/livekitTokenService.ts'), 'utf8')
assert.match(tokenSvc, /createLiveKitAccessToken/)

const proxy = readFileSync(join(root, 'src/main/plugin/capabilityProxy.ts'), 'utf8')
assert.match(proxy, /case 'media\.livekit\.createToken':/)

const preload = readFileSync(join(root, 'src/preload/index.ts'), 'utf8')
assert.match(preload, /meeting:getLiveKitConfig/)
assert.ok(!preload.includes('apiSecret'), 'preload must not expose apiSecret')

const meetingToolbar = readFileSync(
  join(root, 'src/renderer/src/plugin/builtins/MeetingToolbar.tsx'),
  'utf8'
)
assert.match(meetingToolbar, /useMeetingLiveKit/)
assert.match(meetingToolbar, /plugin\.meetingProJoin/)

const liveKitHook = readFileSync(
  join(root, 'src/renderer/src/plugin/builtins/useMeetingLiveKit.ts'),
  'utf8'
)
assert.match(liveKitHook, /setCameraEnabled/)
assert.match(liveKitHook, /setScreenShareEnabled/)
assert.match(liveKitHook, /toggleProCamera/)
assert.match(liveKitHook, /proParticipants/)

assert.ok(existsSync(join(root, 'src/renderer/src/plugin/builtins/MeetingLiveKitVideoGrid.tsx')))
const videoGrid = readFileSync(
  join(root, 'src/renderer/src/plugin/builtins/MeetingLiveKitVideoGrid.tsx'),
  'utf8'
)
assert.match(videoGrid, /meeting-livekit-video-grid/)

const loader = readFileSync(
  join(root, 'src/renderer/src/plugin/builtins/livekitClientLoader.ts'),
  'utf8'
)
assert.match(loader, /import\('livekit-client'\)/)

const profile = readFileSync(
  join(root, 'src/renderer/src/features/profile/LiveKitConfigPanel.tsx'),
  'utf8'
)
assert.match(profile, /LiveKitConfigPanel/)

const roadmap = readFileSync(join(root, 'docs/06_ROADMAP.md'), 'utf8')
assert.match(roadmap, /Pro LiveKit/)

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:meeting-livekit-pro'], 'missing verify:meeting-livekit-pro script')

const deps = { ...pkg.dependencies, ...pkg.devDependencies }
for (const name of Object.keys(deps ?? {})) {
  assert.ok(!/^@livekit\//.test(name) && name !== 'livekit-client', `core dep must not include LiveKit SDK: ${name}`)
}

console.log('verify:meeting-livekit-pro OK')
