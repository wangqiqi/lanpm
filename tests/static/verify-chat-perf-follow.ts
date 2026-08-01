/**
 * TASK-1095 — Chat performance follow-up guards.
 * Run: npm run verify:chat-perf-follow
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

for (const f of [
  'src/shared/chat/messageListMerge.ts',
  'tests/unit/chat/messageListMerge.test.ts'
]) {
  assert.ok(existsSync(join(root, f)), `missing ${f}`)
}

const merge = readFileSync(join(root, 'src/shared/chat/messageListMerge.ts'), 'utf8')
assert.match(merge, /CHAT_MEMORY_WINDOW/)
assert.match(merge, /mergeChatMessage/)
assert.match(merge, /downgradeToLastMessage/)

const store = readFileSync(join(root, 'src/renderer/src/stores/chatStore.ts'), 'utf8')
assert.match(store, /mergeChatMessage/)
assert.match(store, /downgradeInactiveGroups/)

const memberList = readFileSync(join(root, 'src/renderer/src/features/chat/MemberList.tsx'), 'utf8')
assert.match(memberList, /presencePolling/)
assert.ok(memberList.includes('12_000') || memberList.includes('12000'), 'presence poll should be >=10s')
assert.match(memberList, /visibilityState/)

const markRead = readFileSync(join(root, 'src/renderer/src/features/chat/useMarkRead.ts'), 'utf8')
assert.match(markRead, /otherMsgIdsKey/)
assert.ok(!markRead.includes('}, [groupId, localUserId, messages'), 'must not depend on messages array ref')

const dmBar = readFileSync(join(root, 'src/renderer/src/features/chat/DmSessionBar.tsx'), 'utf8')
assert.ok(!dmBar.includes('messagesByGroup = useChatStore'), 'must not subscribe whole messagesByGroup')
assert.match(dmBar, /DmSessionRow/)
assert.match(dmBar, /useDmPreviewStore/)
assert.match(dmBar, /useDmPreviews/)

const codeBlock = readFileSync(join(root, 'src/renderer/src/features/chat/CodeBlock.tsx'), 'utf8')
assert.match(codeBlock, /shouldHighlight/)
assert.match(codeBlock, /highlightCodeAsync/)
assert.match(codeBlock, /memo\(/)

const chatText = readFileSync(join(root, 'src/renderer/src/features/chat/ChatMessageText.tsx'), 'utf8')
assert.match(chatText, /memo\(/)

const chatView = readFileSync(join(root, 'src/renderer/src/features/chat/ChatView.tsx'), 'utf8')
assert.match(chatView, /downgradeInactiveGroups/)
assert.match(chatView, /presencePolling/)

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:chat-perf-follow'], 'missing verify:chat-perf-follow script')

console.log('verify:chat-perf-follow OK')
