/**
 * TASK-224 — task calendar wiring (nav · mapper · FullCalendar · UI).
 * Run: npm run verify:task-calendar
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'
import { tasksToCalendarEvents, addOneDayYmd } from '../../src/shared/task/calendarEvents.ts'
import type { AppView } from '../../src/shared/navigation/types.ts'
import { isViewAllowedForGroup } from '../../src/shared/navigation/tabRules.ts'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')

assert.equal(addOneDayYmd('2026-07-11'), '2026-07-12')
assert.equal(
  tasksToCalendarEvents([
    {
      taskId: 't1',
      groupId: 'g1',
      title: 'Due',
      status: 'todo',
      priority: 'medium',
      progressPercent: 0,
      sortOrder: 0,
      createdBy: 'u',
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
      endDate: '2026-07-11'
    }
  ]).length,
  1
)

assert.equal(isViewAllowedForGroup('project', 'calendar'), true)
assert.equal(isViewAllowedForGroup('function', 'calendar'), false)

const pathsSrc = readFileSync(join(projectRoot, 'src/renderer/src/routes/paths.ts'), 'utf8')
const tabOrder = [...pathsSrc.matchAll(/view:\s*['"](\w+)['"]/g)].map((m) => m[1]!)
const expected: AppView[] = ['chat', 'board', 'tree', 'gantt', 'calendar', 'whiteboard', 'files']
assert.deepEqual(tabOrder, expected, 'VIEW_TABS must place whiteboard between calendar and files')

const routerSrc = readFileSync(join(projectRoot, 'src/renderer/src/app/AppRouter.tsx'), 'utf8')
assert.match(routerSrc, /viewRoute\(\s*['"]calendar['"]\s*\)/)

const pkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}
assert.ok(
  pkg.dependencies?.['@fullcalendar/react'] || pkg.devDependencies?.['@fullcalendar/react'],
  'missing @fullcalendar/react'
)
assert.ok(
  pkg.dependencies?.['@fullcalendar/daygrid'] ||
    pkg.devDependencies?.['@fullcalendar/daygrid'],
  'missing @fullcalendar/daygrid'
)

const calendarView = join(
  projectRoot,
  'src/renderer/src/features/calendar/CalendarView.tsx'
)
assert.ok(existsSync(calendarView), 'CalendarView missing')
const calSrc = readFileSync(calendarView, 'utf8')
assert.match(calSrc, /@fullcalendar\/react/)
assert.match(calSrc, /tasksToCalendarEvents/)
assert.match(calSrc, /TaskEditModal/)
assert.match(calSrc, /editable/)

const bottomNav = readFileSync(
  join(projectRoot, 'src/renderer/src/layout/BottomNav.tsx'),
  'utf8'
)
assert.match(bottomNav, /CalendarOutlined/)
assert.match(bottomNav, /calendar:/)

console.log('verify:task-calendar OK (nav order · mapper · FullCalendar · click-edit)')
