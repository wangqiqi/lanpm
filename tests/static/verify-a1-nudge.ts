/**
 * TASK-283 — A1 nudge: due notify · @assignee · task detail nudge.
 * Run: npm run verify:a1-nudge
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'
import {
  buildAssigneeNudgeDraft,
  classifyDue,
  matchesAssigneeAlias,
  selectDueNudgeTasks
} from '../../src/shared/task/dueNudge.ts'
import { orderMentionCandidates } from '../../src/shared/chat/mentionOrder.ts'
import {
  getNotifyDueTasks,
  NOTIFY_DUE_TASKS_KEY
} from '../../src/shared/chat/notificationPreferences.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

assert.equal(classifyDue('2026-07-11', '2026-07-11'), 'today')
assert.ok(matchesAssigneeAlias('负责人'))
assert.equal(buildAssigneeNudgeDraft('Bob'), '@Bob ')
assert.equal(
  selectDueNudgeTasks(
    [
      {
        taskId: 't1',
        groupId: 'g',
        title: 'x',
        endDate: '2026-07-10',
        status: 'todo',
        assigneeUserId: 'me',
        createdBy: 'me'
      }
    ],
    'me',
    '2026-07-11'
  ).length,
  1
)
assert.equal(NOTIFY_DUE_TASKS_KEY, 'lanpm.task.notifyDueTasks')
// default true when unset (node has no localStorage — function catches)
assert.equal(typeof getNotifyDueTasks(), 'boolean')

assert.deepEqual(
  orderMentionCandidates(
    [
      { userId: 'a', displayName: 'A' },
      { userId: 'b', displayName: 'B' }
    ],
    'fzr',
    { pinUserIds: ['b'] }
  ).map((m) => m.userId),
  ['b']
)

assert.ok(existsSync(join(root, 'src/shared/task/dueNudge.ts')))
assert.ok(existsSync(join(root, 'src/renderer/src/features/task/useDueTaskNotifications.ts')))

const mainLayout = readFileSync(join(root, 'src/renderer/src/layout/MainLayout.tsx'), 'utf8')
assert.match(mainLayout, /useDueTaskNotifications/)

const detail = readFileSync(
  join(root, 'src/renderer/src/features/tree/TaskDetailPanel.tsx'),
  'utf8'
)
assert.match(detail, /task\.nudgeAssignee/)
assert.match(detail, /buildAssigneeNudgeDraft/)
assert.match(detail, /composeDraft/)

const chat = readFileSync(join(root, 'src/renderer/src/features/chat/ChatView.tsx'), 'utf8')
assert.match(chat, /pinUserIds:\s*assigneePinIds/)

const profile = readFileSync(
  join(root, 'src/renderer/src/features/profile/ProfileModal.tsx'),
  'utf8'
)
assert.match(profile, /notifyDueTasks/)

const mentionKb = readFileSync(
  join(root, 'src/renderer/src/features/chat/mentionKeyboard.ts'),
  'utf8'
)
assert.match(mentionKb, /orderMentionCandidates/)

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:a1-nudge'], 'missing verify:a1-nudge')

const feige = readFileSync(join(root, 'docs/飞鸽飞秋.md'), 'utf8')
assert.match(feige, /verify:a1-nudge/)

console.log('verify:a1-nudge OK (due · @assignee · nudge)')
