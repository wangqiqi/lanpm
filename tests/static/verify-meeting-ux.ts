/**
 * Meeting UX productization guards (TASK-985 · SPRINT-51 TASK-5101–5104).
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

/** TASK-5101 — unlicensed / disabled meeting entry CTA */
assert.match(chatView, /toolbarMeetingGroup/)
assert.match(chatView, /meetingPlugin\?\.enabled/)
assert.match(chatView, /plugin\.meetingLicenseCta/)
assert.match(chatView, /openProfileTab/)
assert.match(
  chatView,
  /toolbarMeetingGroup[\s\S]*meetingEnabled \?[\s\S]*PluginZoneHost[\s\S]*plugin\.meetingLicenseCta[\s\S]*openProfileTab/
)

const menuIdx = toolbar.indexOf('data-testid="meeting-toolbar-menu"')
assert.ok(menuIdx >= 0, 'MeetingToolbar main menu test id missing')
const menuSlice = toolbar.slice(menuIdx, menuIdx + 1800)
assert.match(menuSlice, /plugin\.meetingLicenseCta/)
assert.match(menuSlice, /openProfileTab/)

assert.match(toolbar, /disabled=\{controlsDisabled \|\| busy \|\| proJoined\}/)
assert.match(
  toolbar,
  /disabled=\{controlsDisabled \|\| busy \|\| !liveKitConfigured \|\| joined \|\| sdkMissing\}/
)
assert.match(toolbar, /const onJoin[\s\S]*?if \(!licenseActive\) return[\s\S]*?joinRoom/)
assert.match(toolbar, /const onProJoin[\s\S]*?if \(!licenseActive\) return[\s\S]*?joinProRoom/)

assert.ok(!toolbar.includes('meet.jit.si'), 'must not invent public SFU')
assert.ok(!stub.includes('meet.jit.si'), 'MeetingStub must not invent public SFU')
assert.match(stub, /return <MeetingToolbar/)

const zh = readFileSync(join(root, 'src/renderer/src/i18n/locales/zh-CN.ts'), 'utf8')
assert.match(zh, /plugin\.meetingLicenseCta/)
assert.match(zh, /plugin\.meetingOpenPlugins/)

/** TASK-5102 — Lite vs Pro tiers on toolbar/panel + readable Pro failures */
const menuStart = toolbar.indexOf('const menuContent')
assert.ok(menuStart >= 0, 'MeetingToolbar menuContent missing')
const menuBlock = toolbar.slice(menuStart)
assert.match(menuBlock, /plugin\.meetingLiteSection/)
assert.match(menuBlock, /plugin\.meetingProSection/)
assert.match(menuBlock, /plugin\.meetingProSdkMissing/)
assert.match(menuBlock, /plugin\.meetingProNotConfigured/)
assert.match(menuBlock, /plugin\.meetingProConfigureHint/)
assert.match(toolbar, /data-testid="meeting-detail-panel"/)
assert.match(toolbar, /plugin\.meetingLiteSection/)
assert.match(toolbar, /plugin\.meetingProSection/)

const en = readFileSync(join(root, 'src/renderer/src/i18n/locales/en-US.ts'), 'utf8')
const meetingUxKeys = [
  'plugin.meetingLicenseCta',
  'plugin.meetingOpenPlugins',
  'plugin.meetingLiteSection',
  'plugin.meetingProSection',
  'plugin.meetingProSdkMissing',
  'plugin.meetingProNotConfigured',
  'plugin.meetingProConfigureHint'
]
for (const key of meetingUxKeys) {
  const re = new RegExp(key.replaceAll('.', '\\.'))
  assert.match(zh, re, `zh-CN missing ${key}`)
  assert.match(en, re, `en-US missing ${key}`)
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:meeting-ux'], 'missing verify:meeting-ux script')
assert.ok(
  !pkg.dependencies?.['livekit-client'],
  'must not add livekit-client to core dependencies'
)

assert.ok(existsSync(join(root, 'tests/unit/plugin/pluginLicense.test.ts')))

/** TASK-5103 — local/LAN LiveKit bypass shortest ops (no public SFU default) */
const docs07 = readFileSync(join(root, 'docs/07_插件与扩展.md'), 'utf8')
const docs06 = readFileSync(join(root, 'docs/06_ROADMAP.md'), 'utf8')
const composePath = 'plugins/lanpm.meeting/deploy/docker-compose.yml'
const opsDocs = docs07.includes(composePath) ? docs07 : docs06
assert.match(
  opsDocs,
  /本机[\s\S]*内网|内网[\s\S]*本机/,
  'docs/07 or docs/06 must document shortest local/LAN LiveKit steps'
)
assert.ok(
  opsDocs.includes(composePath),
  `docs must mention compose path ${composePath}`
)
assert.match(opsDocs, /docker compose/)
assert.match(opsDocs, /ws:\/\//)

const composeFile = readFileSync(join(root, composePath), 'utf8')
const forbiddenPublicSfu = ['livekit.cloud', 'LiveKit Cloud', 'meet.jit.si'] as const
for (const needle of forbiddenPublicSfu) {
  assert.ok(
    !opsDocs.includes(needle),
    `ops docs must not mention ${needle} as default public SFU`
  )
  assert.ok(
    !composeFile.includes(needle),
    `compose must not mention ${needle} as default public SFU`
  )
}

/** TASK-5104 — docs/06 §3.3 points at this Sprint's delivery, not leftover 深化 */
const section33 = docs06.split('### 3.3')[1]?.split('### 3.4')[0] ?? ''
assert.ok(section33.length > 0, 'docs/06 §3.3 missing')
assert.ok(!section33.includes('还需深化'), 'docs/06 §3.3 must not leave 还需深化 as undone')
assert.ok(!section33.includes('**深化**'), 'docs/06 §3.3 must not mark UX as still 深化')
assert.match(section33, /CTA/)
assert.match(section33, /Lite/)
assert.match(section33, /Pro/)
assert.match(section33, /最短运维/)
assert.match(section33, /verify:meeting-ux/)
assert.match(docs06, /### 3\.5[\s\S]*verify:meeting-ux/)

const docs05 = readFileSync(join(root, 'docs/05_测试与联调发布.md'), 'utf8')
assert.match(docs05, /verify:meeting-regression-playbook/, 'docs/05 links meeting regression playbook')
assert.match(docs05, /verify:meeting-ux/, 'docs/05 §1.2.9 lists meeting-ux')

console.log('verify:meeting-ux OK')
