/**
 * TASK-205 — nav badge semantics (mine-open board · chat unread · no boardTodo).
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

const types = readFileSync(join(root, 'src/shared/badge/types.ts'), 'utf8')
assert.match(types, /boardMineOpen/)
assert.doesNotMatch(types, /boardTodo/)

const service = readFileSync(join(root, 'src/main/badge/badgeService.ts'), 'utf8')
assert.match(service, /countMineOpenTasks/)
assert.match(service, /assignee_user_id/)
assert.match(service, /status IN \('todo', 'doing'\)/)
assert.doesNotMatch(service, /boardTodo/)

const stub = readFileSync(join(root, 'src/renderer/src/platform/browserLanpmStub.ts'), 'utf8')
assert.match(stub, /countMineOpenTasks/)
assert.match(stub, /boardMineOpen/)

const store = readFileSync(join(root, 'src/renderer/src/stores/badgeStore.ts'), 'utf8')
assert.match(store, /boardMineOpen/)
assert.doesNotMatch(store, /boardTodo/)

const nav = readFileSync(join(root, 'src/renderer/src/layout/BottomNav.tsx'), 'utf8')
assert.match(nav, /boardMineOpen/)
assert.doesNotMatch(nav, /boardTodo/)

const topCss = readFileSync(join(root, 'src/renderer/src/layout/TopBar.module.css'), 'utf8')
assert.match(topCss, /netDotPulse/)
assert.match(topCss, /prefers-reduced-motion/)

console.log('verify:badge-semantics OK')
