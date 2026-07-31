/**
 * TASK-1070 — Meeting schedule + reminder guards.
 * Run: npm run verify:meeting-schedule
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

assert.ok(existsSync(join(root, 'src/shared/media/meetingSchedule.ts')))
assert.ok(existsSync(join(root, 'src/main/media/meetingScheduleStore.ts')))
assert.ok(existsSync(join(root, 'src/main/media/meetingReminderService.ts')))
assert.ok(existsSync(join(root, 'src/renderer/src/plugin/builtins/MeetingSchedulePanel.tsx')))

const schedule = readFileSync(join(root, 'src/shared/media/meetingSchedule.ts'), 'utf8')
assert.match(schedule, /MeetingSchedule/)
assert.match(schedule, /createMeetingScheduleRecord/)

const channels = readFileSync(join(root, 'src/shared/media/channels.ts'), 'utf8')
assert.match(channels, /listSchedules/)
assert.match(channels, /createSchedule/)
assert.match(channels, /deleteSchedule/)

const reminder = readFileSync(join(root, 'src/shared/media/meetingReminderLogic.ts'), 'utf8')
assert.match(reminder, /scanMeetingReminders/)
assert.match(reminder, /5min/)

const main = readFileSync(join(root, 'src/main/index.ts'), 'utf8')
assert.match(main, /initMeetingReminderService/)

const panel = readFileSync(
  join(root, 'src/renderer/src/plugin/builtins/MeetingSchedulePanel.tsx'),
  'utf8'
)
assert.match(panel, /meeting-schedule-panel/)
assert.match(panel, /listSchedules/)
assert.match(panel, /createSchedule/)

const zh = readFileSync(join(root, 'src/renderer/src/i18n/locales/zh-CN.ts'), 'utf8')
assert.match(zh, /plugin\.meetingScheduleHint/)
assert.match(zh, /plugin\.meetingReminder5minTitle/)

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:meeting-schedule'], 'missing verify:meeting-schedule script')

console.log('verify:meeting-schedule OK')
