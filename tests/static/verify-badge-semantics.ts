/**
 * Nav badge semantics — mine-open · recent weak dot · chat unread.
 * Run: npm run verify:badge-semantics
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { projectRoot } from '../projectRoot.ts'
import {
  countMineOpenTasks,
  isMineOpenTask,
  MINE_OPEN_STATUSES
} from '../../src/shared/badge/mineOpen.ts'
import { shouldShowBoardRecentDot } from '../../src/shared/badge/boardRecentDot.ts'

const root = projectRoot

assert.deepEqual([...MINE_OPEN_STATUSES], ['todo', 'doing'])
assert.equal(
  countMineOpenTasks(
    [
      { assigneeUserId: 'me', status: 'todo' },
      { assigneeUserId: 'me', status: 'doing' },
      { assigneeUserId: 'me', status: 'done' },
      { assigneeUserId: 'other', status: 'todo' }
    ],
    'me'
  ),
  2
)
assert.equal(isMineOpenTask({ assigneeUserId: 'me', status: 'todo' }, 'me'), true)

assert.equal(
  shouldShowBoardRecentDot({
    boardMineOpen: 0,
    boardLatestUpdatedAt: '2026-07-11T10:00:00.000Z',
    lastBoardSeenAt: null,
    nowIso: '2026-07-11T12:00:00.000Z'
  }),
  true
)
assert.equal(
  shouldShowBoardRecentDot({
    boardMineOpen: 1,
    boardLatestUpdatedAt: '2026-07-11T10:00:00.000Z',
    lastBoardSeenAt: null,
    nowIso: '2026-07-11T12:00:00.000Z'
  }),
  false
)

const types = readFileSync(join(root, 'src/shared/badge/types.ts'), 'utf8')
assert.match(types, /boardMineOpen/)
assert.match(types, /boardLatestUpdatedAt/)
assert.doesNotMatch(types, /boardTodo/)

const service = readFileSync(join(root, 'src/main/badge/badgeService.ts'), 'utf8')
assert.match(service, /countMineOpenTasks/)
assert.match(service, /getBoardLatestUpdatedAt/)
assert.match(service, /assignee_user_id/)
assert.doesNotMatch(service, /boardTodo/)

const stub = readFileSync(join(root, 'src/renderer/src/platform/browserLanpmStub.ts'), 'utf8')
assert.match(stub, /countMineOpenTasks/)
assert.match(stub, /boardLatestUpdatedAt/)

const store = readFileSync(join(root, 'src/renderer/src/stores/badgeStore.ts'), 'utf8')
assert.match(store, /boardRecentDot/)
assert.match(store, /markBoardSeenAndRefresh/)

const nav = readFileSync(join(root, 'src/renderer/src/layout/BottomNav.tsx'), 'utf8')
assert.match(nav, /boardMineOpen/)
assert.match(nav, /boardRecentDot/)
assert.match(nav, /dot=\{showDot\}/)

const topCss = readFileSync(join(root, 'src/renderer/src/layout/TopBar.module.css'), 'utf8')
assert.match(topCss, /netDotPulse/)

console.log('verify:badge-semantics OK')
