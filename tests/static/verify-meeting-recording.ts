/**
 * TASK-1070 — Meeting local recording guards.
 * Run: npm run verify:meeting-recording
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

assert.ok(existsSync(join(root, 'src/renderer/src/plugin/builtins/useMeetingRecording.ts')))

const hook = readFileSync(
  join(root, 'src/renderer/src/plugin/builtins/useMeetingRecording.ts'),
  'utf8'
)
assert.match(hook, /MediaRecorder/)
assert.match(hook, /getUserMedia/)
assert.match(hook, /saveRecording/)

const toolbar = readFileSync(
  join(root, 'src/renderer/src/plugin/builtins/MeetingToolbar.tsx'),
  'utf8'
)
assert.match(toolbar, /useMeetingRecording/)
assert.match(toolbar, /meeting-record-start/)
assert.match(toolbar, /meeting-record-stop/)
assert.match(toolbar, /meeting-recording-timer/)

const channels = readFileSync(join(root, 'src/shared/media/channels.ts'), 'utf8')
assert.match(channels, /saveRecording/)

const meetingIpc = readFileSync(join(root, 'src/main/ipc/meeting.ts'), 'utf8')
assert.match(meetingIpc, /showSaveDialog/)
assert.match(meetingIpc, /saveRecording/)
assert.match(meetingIpc, /meetingSaveRecordingDialogTitle/)
assert.match(meetingIpc, /readAppLocale/)

assert.ok(existsSync(join(root, 'src/shared/media/meetingRecordingCopy.ts')))

const preload = readFileSync(join(root, 'src/preload/index.ts'), 'utf8')
assert.match(preload, /saveRecording/)

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:meeting-recording'], 'missing verify:meeting-recording script')

console.log('verify:meeting-recording OK')
