/**
 * TASK-288 — B2 member search: shared matcher · board · select · MemberList.
 * Run: npm run verify:member-search
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'
import {
  filterTasksByAssigneeSearch,
  matchesMemberSearch,
  memberSelectFilterOption
} from '../../src/shared/chat/matchMemberSearch.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const alice = {
  userId: 'u_alice',
  displayName: '张三',
  mentionKeys: ['zhangsan', 'alice']
}

assert.equal(matchesMemberSearch(alice, ''), true)
assert.equal(matchesMemberSearch(alice, '张'), true)
assert.equal(matchesMemberSearch(alice, 'zs'), true)
assert.equal(matchesMemberSearch(alice, 'alice'), true)
assert.equal(matchesMemberSearch(alice, 'bob'), false)

assert.deepEqual(
  filterTasksByAssigneeSearch(
    [
      { taskId: 't1', assigneeUserId: 'u_alice' },
      { taskId: 't2', assigneeUserId: null }
    ],
    [alice],
    'zs'
  ).map((t) => t.taskId),
  ['t1']
)

assert.equal(
  memberSelectFilterOption('zs', { value: 'u_alice', label: '张三' }, [alice]),
  true
)
assert.equal(
  memberSelectFilterOption('bob', { value: 'u_alice', label: '张三' }, [alice]),
  false
)

assert.ok(existsSync(join(root, 'src/shared/chat/matchMemberSearch.ts')))

const board = readFileSync(
  join(root, 'src/renderer/src/features/board/BoardView.tsx'),
  'utf8'
)
assert.match(board, /filterTasksByAssigneeSearch/)
assert.match(board, /assigneeSearch/)
assert.match(board, /board\.assigneeFilter/)

const detail = readFileSync(
  join(root, 'src/renderer/src/features/tree/TaskDetailPanel.tsx'),
  'utf8'
)
assert.match(detail, /memberSelectFilterOption/)
assert.match(detail, /showSearch/)

const edit = readFileSync(
  join(root, 'src/renderer/src/features/board/TaskEditModal.tsx'),
  'utf8'
)
assert.match(edit, /memberSelectFilterOption/)
assert.match(edit, /showSearch/)

const memberList = readFileSync(
  join(root, 'src/renderer/src/features/chat/MemberList.tsx'),
  'utf8'
)
assert.match(memberList, /matchesMemberSearch/)
assert.match(memberList, /chat\.memberSearch/)

const pkg = readFileSync(join(root, 'package.json'), 'utf8')
assert.match(pkg, /"verify:member-search"/)

console.log('verify:member-search OK')
