/**
 * TASK-1037 — Message bubble context menu guards.
 * Run: npm run verify:message-context-menu
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const shared = readFileSync(join(root, 'src/shared/chat/messageContextMenu.ts'), 'utf8')
assert.match(shared, /getMessageCopyPayload/)
assert.match(shared, /buildMessageContextMenuActions/)
assert.match(shared, /linkExistingTask/)

const bubble = readFileSync(join(root, 'src/renderer/src/features/chat/MessageBubble.tsx'), 'utf8')
assert.match(bubble, /buildMessageContextMenuActions/)
assert.match(bubble, /messageContextActions/)
assert.match(bubble, /onLinkMessageToTask/)
assert.doesNotMatch(bubble, /type:\s*'divider'/, 'plugin menu must stay flat without dividers')

const chatView = readFileSync(join(root, 'src/renderer/src/features/chat/ChatView.tsx'), 'utf8')
assert.match(chatView, /linkToTaskModal/)
assert.match(chatView, /sourceMsgId: linkToTaskModal\.msgId/)

const zh = readFileSync(join(root, 'src/renderer/src/i18n/locales/zh-CN.ts'), 'utf8')
assert.match(zh, /chat\.copyMessage/)
assert.match(zh, /chat\.linkMessageToTask/)

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:message-context-menu'], 'missing verify:message-context-menu script')

assert.ok(existsSync(join(root, 'tests/unit/chat/messageContextMenu.test.ts')))

console.log('verify:message-context-menu OK')
