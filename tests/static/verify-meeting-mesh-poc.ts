/**
 * TASK-856 — Lite mesh POC guards.
 * Run: npm run verify:meeting-mesh-poc
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const types = readFileSync(join(root, 'src/shared/network/types.ts'), 'utf8')
assert.match(types, /'media_signal'/)

const mediaShared = readFileSync(join(root, 'src/shared/media/mediaSignal.ts'), 'utf8')
assert.match(mediaShared, /MediaSignalPayload/)
assert.match(mediaShared, /MEDIA_ROOM_MAX_PARTICIPANTS/)

const service = readFileSync(join(root, 'src/main/media/mediaSignalService.ts'), 'utf8')
assert.match(service, /handleIncomingMediaSignal/)
assert.match(service, /initMediaSignalService/)

const room = readFileSync(join(root, 'src/shared/media/mediaSignalRoom.ts'), 'utf8')
assert.match(room, /media_room_full/)

const proxy = readFileSync(join(root, 'src/main/plugin/capabilityProxy.ts'), 'utf8')
assert.match(proxy, /sendMediaSignal/)
assert.match(proxy, /pollMediaSignals/)
assert.match(proxy, /listDesktopCaptureSources/)
assert.ok(!proxy.includes('stub: true'), 'capabilityProxy must not return media stubs')

const desktop = readFileSync(join(root, 'src/main/media/desktopCaptureService.ts'), 'utf8')
assert.match(desktop, /desktopCapturer/)

const chatService = readFileSync(join(root, 'src/main/chat/chatService.ts'), 'utf8')
assert.match(chatService, /initMediaSignalService/)

const meetingStub = readFileSync(
  join(root, 'src/renderer/src/plugin/builtins/MeetingStub.tsx'),
  'utf8'
)
const meshHook = readFileSync(
  join(root, 'src/renderer/src/plugin/builtins/useMeetingMesh.ts'),
  'utf8'
)
assert.match(meetingStub, /meetingJoin/)
assert.match(meshHook, /RTCPeerConnection/)

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:meeting-mesh-poc'], 'missing verify:meeting-mesh-poc script')
assert.ok(pkg.scripts?.['verify:media-signal'], 'missing verify:media-signal script')

const deps = { ...pkg.dependencies, ...pkg.devDependencies }
for (const name of Object.keys(deps ?? {})) {
  assert.ok(name !== 'webrtc' && name !== 'simple-peer', `forbidden mesh dep: ${name}`)
}

assert.ok(existsSync(join(root, 'tests/integration/verify-media-signal.ts')))

console.log('verify:meeting-mesh-poc OK')
