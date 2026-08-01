/**
 * TASK-1105 — Chat performance P3 guards.
 * Run: npm run verify:chat-perf-p3
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

for (const f of [
  'docs/specs/007-chat-perf-p3/spec.md',
  'src/shared/util/bounded.ts',
  'src/renderer/src/features/chat/ChatMessageActionsContext.tsx',
  'src/renderer/src/features/chat/chatMarkdownCache.ts'
]) {
  assert.ok(existsSync(join(root, f)), `missing ${f}`)
}

const registry = readFileSync(join(root, 'src/main/plugin/menuRegistry.ts'), 'utf8')
assert.match(registry, /location\?: PluginMenuLocation/)
assert.match(registry, /item\.location === location/)

const ipc = readFileSync(join(root, 'src/main/ipc/plugin.ts'), 'utf8')
assert.match(ipc, /isPluginMenuLocation/)
assert.match(ipc, /listMenus\(location\)/)

const preload = readFileSync(join(root, 'src/preload/index.ts'), 'utf8')
assert.match(preload, /listMenus:\s*\(location/)

const cache = readFileSync(join(root, 'src/renderer/src/plugin/pluginMenusCache.ts'), 'utf8')
assert.match(cache, /cacheByKey/)
assert.match(cache, /\.listMenus\(location\)/)

const provider = readFileSync(
  join(root, 'src/renderer/src/features/chat/ChatPluginMenusProvider.tsx'),
  'utf8'
)
assert.match(provider, /fetchPluginMenusCached\(location\)/)

const bubble = readFileSync(join(root, 'src/renderer/src/features/chat/MessageBubble.tsx'), 'utf8')
assert.ok(!bubble.includes('useNavigate'), 'MessageBubble must not use useNavigate')
assert.ok(!bubble.includes('useParams'), 'MessageBubble must not use useParams')
assert.ok(!bubble.includes('useLocateTask'), 'MessageBubble must not use useLocateTask')
assert.match(bubble, /useChatMessageActions/)
assert.match(bubble, /memberById/)
assert.match(bubble, /mentionMembers/)

const chatView = readFileSync(join(root, 'src/renderer/src/features/chat/ChatView.tsx'), 'utf8')
assert.match(chatView, /ChatMessageActionsProvider/)
assert.match(chatView, /replyQuotesByMsgId/)
assert.match(chatView, /memberById/)

const highlight = readFileSync(join(root, 'src/renderer/src/features/chat/highlightSetup.ts'), 'utf8')
assert.ok(!highlight.includes('highlightAuto'), 'must not use highlightAuto')
assert.match(highlight, /HIGHLIGHT_MAX_CHARS/)
assert.match(highlight, /LruMap/)

const markdown = readFileSync(join(root, 'src/renderer/src/ui/MarkdownView.tsx'), 'utf8')
assert.match(markdown, /cacheKey/)
assert.match(markdown, /chatMarkdownCache/)

const chatText = readFileSync(join(root, 'src/renderer/src/features/chat/ChatMessageText.tsx'), 'utf8')
assert.match(chatText, /msgId/)
assert.match(chatText, /cacheKey={msgId}/)

const notifications = readFileSync(
  join(root, 'src/renderer/src/features/chat/useChatNotifications.ts'),
  'utf8'
)
assert.match(notifications, /BoundedSet/)
assert.match(notifications, /NOTIFIED_IDS_MAX/)

const scroll = readFileSync(join(root, 'src/renderer/src/features/chat/useNewMessageScroll.ts'), 'utf8')
assert.match(scroll, /SCROLL_MEMORY_MAX_GROUPS/)
assert.match(scroll, /rememberScrollMemory/)

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
  version?: string
}
assert.ok(pkg.scripts?.['verify:chat-perf-p3'], 'missing verify:chat-perf-p3 script')
assert.equal(pkg.version, '1.85.0', 'package.json version should be 1.85.0')

console.log('verify:chat-perf-p3 OK')
