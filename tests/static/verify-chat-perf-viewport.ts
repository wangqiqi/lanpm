/**
 * TASK-1112 — Chat performance viewport guards.
 * Run: npm run verify:chat-perf-viewport
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

for (const f of [
  'src/shared/chat/imageFile.ts',
  'src/renderer/src/features/chat/messageContentDefer.tsx'
]) {
  assert.ok(existsSync(join(root, f)), `missing ${f}`)
}

const defer = readFileSync(
  join(root, 'src/renderer/src/features/chat/messageContentDefer.tsx'),
  'utf8'
)
assert.match(defer, /MessageContentDeferProvider/)
assert.match(defer, /useDeferHeavyContent/)
assert.match(defer, /shouldDeferHeavyContentForRow/)

const virtualList = readFileSync(
  join(root, 'src/renderer/src/features/chat/ChatVirtualMessageList.tsx'),
  'utf8'
)
assert.match(virtualList, /MessageContentDeferProvider/)
assert.match(virtualList, /shouldDeferHeavyContentForRow/)

const bubble = readFileSync(join(root, 'src/renderer/src/features/chat/MessageBubble.tsx'), 'utf8')
assert.match(bubble, /useDeferHeavyContent/)
assert.match(bubble, /deferHeavyContent/)
assert.match(bubble, /deferImage/)
assert.match(bubble, /data-defer-media/)

const chatText = readFileSync(join(root, 'src/renderer/src/features/chat/ChatMessageText.tsx'), 'utf8')
assert.match(chatText, /deferHeavyContent/)

const codeBlock = readFileSync(join(root, 'src/renderer/src/features/chat/CodeBlock.tsx'), 'utf8')
assert.match(codeBlock, /deferHeavyContent/)
assert.match(codeBlock, /data-deferred/)

const markdown = readFileSync(join(root, 'src/renderer/src/ui/MarkdownView.tsx'), 'utf8')
assert.match(markdown, /loading="lazy"/)
assert.match(markdown, /deferHeavyContent/)

const avatar = readFileSync(join(root, 'src/renderer/src/ui/UserAvatar.tsx'), 'utf8')
assert.match(avatar, /deferImage/)
assert.match(avatar, /data-deferred-avatar/)

const imageFile = readFileSync(join(root, 'src/shared/chat/imageFile.ts'), 'utf8')
assert.match(imageFile, /isImageFileName/)

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
  version?: string
}
assert.ok(pkg.scripts?.['verify:chat-perf-viewport'], 'missing verify:chat-perf-viewport script')

console.log('verify:chat-perf-viewport OK')
