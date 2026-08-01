/**
 * TASK-985 — Meeting UX productization guards.
 * Run: npm run verify:meeting-ux
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

assert.ok(existsSync(join(root, 'src/renderer/src/plugin/builtins/MeetingToolbar.tsx')))

const toolbar = readFileSync(
  join(root, 'src/renderer/src/plugin/builtins/MeetingToolbar.tsx'),
  'utf8'
)
assert.match(toolbar, /MeetingSchedulePanel/)
assert.match(toolbar, /useMeetingRecording/)
assert.match(toolbar, /meeting-schedule-button/)

const stub = readFileSync(join(root, 'src/renderer/src/plugin/builtins/MeetingStub.tsx'), 'utf8')
assert.match(stub, /MeetingToolbar/)

const license = readFileSync(join(root, 'src/renderer/src/plugin/pluginLicense.ts'), 'utf8')
assert.match(license, /isPluginLicenseActive/)

const openProfile = readFileSync(join(root, 'src/renderer/src/plugin/openProfileTab.ts'), 'utf8')
assert.match(openProfile, /LANPM_OPEN_PROFILE_EVENT/)
assert.match(openProfile, /openProfileTab/)

const voicePanel = readFileSync(
  join(root, 'src/renderer/src/features/chat/ChatVoiceMediaPanel.tsx'),
  'utf8'
)
assert.match(voicePanel, /chat-voice-hold-btn/)
assert.match(voicePanel, /sendVoice/)
assert.ok(!voicePanel.includes('voiceComingSoon'), 'ChatVoiceMediaPanel must not use voiceComingSoon')

const chatView = readFileSync(join(root, 'src/renderer/src/features/chat/ChatView.tsx'), 'utf8')
assert.ok(!chatView.includes('voiceComingSoon'), 'ChatView must not hardcode voiceComingSoon')

const zh = readFileSync(join(root, 'src/renderer/src/i18n/locales/zh-CN.ts'), 'utf8')
assert.match(zh, /plugin\.meetingLicenseCta/)
assert.match(zh, /plugin\.meetingOpenPlugins/)

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:meeting-ux'], 'missing verify:meeting-ux script')

assert.ok(existsSync(join(root, 'tests/unit/plugin/pluginLicense.test.ts')))

console.log('verify:meeting-ux OK')
