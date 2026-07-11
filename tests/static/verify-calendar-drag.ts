/**
 * TASK-244 — calendar drag/resize reschedule wiring.
 * Run: npm run verify:calendar-drag
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'
import {
  addOneDayYmd,
  scheduleFromCalendarExclusiveRange,
  tasksToCalendarEvents
} from '../../src/shared/task/calendarEvents.ts'
import { defaultScheduleForTask } from '../../src/shared/task/ganttAdapter.ts'
import type { Task } from '../../src/shared/task/types.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const mapped = scheduleFromCalendarExclusiveRange('2026-07-10', '2026-07-13')
assert.deepEqual(mapped, { startDate: '2026-07-10', endDate: '2026-07-12' })

const undated: Task = {
  taskId: 'a',
  groupId: 'g1',
  title: 'x',
  status: 'todo',
  priority: 'medium',
  progressPercent: 0,
  sortOrder: 0,
  createdBy: 'u1',
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z'
}
const ev = tasksToCalendarEvents([undated])[0]!
assert.equal(ev.extendedProps.inferredSchedule, true)
const fromInferred = scheduleFromCalendarExclusiveRange(ev.start, ev.end)
const fallback = defaultScheduleForTask(undated)
assert.deepEqual(fromInferred, {
  startDate: fallback.startDate,
  endDate: fallback.endDate
})
assert.equal(ev.end, addOneDayYmd(fallback.endDate))

const view = readFileSync(
  join(root, 'src/renderer/src/features/calendar/CalendarView.tsx'),
  'utf8'
)
assert.match(view, /@fullcalendar\/interaction/)
assert.match(view, /eventDrop/)
assert.match(view, /eventResize/)
assert.match(view, /updateSchedule/)
assert.match(view, /scheduleFromCalendarExclusiveRange/)
assert.match(view, /editable/)

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  dependencies?: Record<string, string>
  scripts?: Record<string, string>
}
assert.ok(pkg.dependencies?.['@fullcalendar/interaction'], 'missing interaction plugin')
assert.ok(pkg.scripts?.['verify:calendar-drag'], 'missing verify:calendar-drag')

assert.ok(existsSync(join(root, 'src/shared/task/calendarEvents.ts')))

const docs04 = readFileSync(join(root, 'docs/04_交互与UI约定.md'), 'utf8')
assert.match(docs04, /拖拽\/拉伸改期/)

console.log('verify:calendar-drag OK (mapping · interaction · updateSchedule · docs)')
