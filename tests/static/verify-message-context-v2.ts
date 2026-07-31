/**
 * TASK-1054 — Message context menu v2 guards.
 * Run: npm run verify:message-context-v2
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const menu = readFileSync(join(root, 'src/shared/chat/messageContextMenu.ts'), 'utf8')
assert.match(menu, /reply/)
assert.match(menu, /forward/)
assert.ok(!/\bid:\s*'pin'\b/.test(menu), 'pin must not be in bubble context menu')
assert.ok(!/\bid:\s*'hide'\b/.test(menu), 'hide must not be in bubble context menu')
assert.ok(!/\bid:\s*'linkFile'\b/.test(menu), 'linkFile must not be in bubble context menu')
assert.match(menu, /edit/)

const chatView = readFileSync(join(root, 'src/renderer/src/features/chat/ChatView.tsx'), 'utf8')
assert.match(chatView, /ReplyQuoteBar/)
assert.match(chatView, /ForwardMessageModal/)
assert.match(chatView, /EditMessageModal/)
assert.match(chatView, /ChatBatchBar/)
assert.match(chatView, /replyToMsgId/)

const api = readFileSync(join(root, 'src/shared/lanpm-api.ts'), 'utf8')
assert.match(api, /editMessage/)
assert.match(api, /forwardMessage/)
assert.match(api, /listPinnedIds/)

const network = readFileSync(join(root, 'src/shared/network/types.ts'), 'utf8')
assert.match(network, /chat_edit/)
assert.match(network, /chat_pin/)

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:message-context-v2'], 'missing verify:message-context-v2 script')

for (const f of [
  'tests/unit/chat/replyQuote.test.ts',
  'tests/unit/chat/forwardMessage.test.ts',
  'tests/unit/chat/messageEdit.test.ts',
  'tests/unit/chat/pin.test.ts'
]) {
  assert.ok(existsSync(join(root, f)), `missing ${f}`)
}

console.log('verify:message-context-v2 OK')
