/**
 * TASK-1145 — Chat store-hooks guards.
 * Run: npm run verify:chat-perf-store-hooks
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

assert.ok(existsSync(join(root, 'docs/specs/012-chat-perf-store-hooks/spec.md')))
assert.ok(existsSync(join(root, 'src/renderer/src/features/chat/chatStoreActions.ts')))

const actions = readFileSync(
  join(root, 'src/renderer/src/features/chat/chatStoreActions.ts'),
  'utf8'
)
assert.match(actions, /chatStoreActions/)
assert.match(actions, /getState\(\)\.sendText/)
assert.match(actions, /getState\(\)\.loadMessages/)

const chatView = readFileSync(join(root, 'src/renderer/src/features/chat/ChatView.tsx'), 'utf8')
assert.match(chatView, /chatStoreActions/)
assert.match(chatView, /navGroups/)

const forbiddenActionSelectors = [
  'useChatStore((s) => s.sendText)',
  'useChatStore((s) => s.loadMessages)',
  'useChatStore((s) => s.loadOlderMessages)',
  'useChatStore((s) => s.downgradeInactiveGroups)',
  'useTaskStore((s) => s.createFromChat)',
  'useChatPinStore((s) => s.togglePin)',
  'useChatMembersStore((s) => s.loadMembers)',
  'useNavigationStore((s) => s.getGroupType)'
]
for (const pattern of forbiddenActionSelectors) {
  assert.ok(!chatView.includes(pattern), `ChatView must not subscribe to action: ${pattern}`)
}

const dmBar = readFileSync(join(root, 'src/renderer/src/features/chat/DmSessionBar.tsx'), 'utf8')
assert.match(dmBar, /chatStoreActions/)
assert.ok(!dmBar.includes('useChatStore((s) => s.loadMessages)'), 'DmSessionBar: no loadMessages selector')

const memberList = readFileSync(join(root, 'src/renderer/src/features/chat/MemberList.tsx'), 'utf8')
assert.match(memberList, /chatStoreActions/)
assert.ok(!memberList.includes('useDmStore((s) => s.openSession)'), 'MemberList: no openSession selector')

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:chat-perf-store-hooks'], 'missing verify:chat-perf-store-hooks')

console.log('verify:chat-perf-store-hooks OK')
