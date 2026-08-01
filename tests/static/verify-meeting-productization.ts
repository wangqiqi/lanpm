/**
 * TASK-1137 — Meeting productization guards.
 * Run: npm run verify:meeting-productization
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

assert.ok(existsSync(join(root, 'docs/specs/011-meeting-productization/spec.md')))

const copy = readFileSync(join(root, 'src/shared/media/meetingReminderCopy.ts'), 'utf8')
assert.match(copy, /meetingReminderTitle/)
assert.match(copy, /meetingReminderBody/)
assert.match(copy, /formatMeetingReminderWhen/)

const localeStore = readFileSync(join(root, 'src/main/locale/localeStore.ts'), 'utf8')
assert.match(localeStore, /LOCALE_FILE_NAME/)
assert.match(localeStore, /readAppLocale/)

const reminder = readFileSync(join(root, 'src/main/media/meetingReminderService.ts'), 'utf8')
assert.doesNotMatch(reminder, /会议将在 5 分钟后开始/)
assert.match(reminder, /meetingReminderTitle/)
assert.match(reminder, /readAppLocale/)
assert.match(reminder, /groupId: hit\.schedule\.groupId/)

const desktop = readFileSync(join(root, 'src/main/desktopNotification.ts'), 'utf8')
assert.match(desktop, /NOTIFICATION_NAVIGATE_CHANNEL/)
assert.match(desktop, /n\.on\('click'/)

const channels = readFileSync(join(root, 'src/shared/notification/channels.ts'), 'utf8')
assert.match(channels, /NOTIFICATION_NAVIGATE_CHANNEL/)

const preload = readFileSync(join(root, 'src/preload/index.ts'), 'utf8')
assert.match(preload, /onNavigate/)
assert.match(preload, /LOCALE_IPC/)

const uiStore = readFileSync(join(root, 'src/renderer/src/stores/uiStore.ts'), 'utf8')
assert.match(uiStore, /locale\.set/)

const navHook = readFileSync(
  join(root, 'src/renderer/src/features/meeting/useNotificationNavigation.ts'),
  'utf8'
)
assert.match(navHook, /groupViewPath/)
assert.match(navHook, /onNavigate/)

const panel = readFileSync(
  join(root, 'src/renderer/src/plugin/builtins/MeetingSchedulePanel.tsx'),
  'utf8'
)
assert.match(panel, /meetingScheduleDurationOption/)
assert.match(panel, /meeting-schedule-join/)
assert.match(panel, /formatScheduleWhen\(item\.startsAt, locale\)/)

const zh = readFileSync(join(root, 'src/renderer/src/i18n/locales/zh-CN.ts'), 'utf8')
assert.match(zh, /plugin\.meetingScheduleJoin/)
assert.match(zh, /plugin\.meetingScheduleDurationOption/)

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:meeting-productization'], 'missing verify:meeting-productization')

console.log('verify:meeting-productization OK')
