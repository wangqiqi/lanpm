/**
 * TASK-1085 — Chat performance guards (chat-perf Sprint).
 * Run: npm run verify:chat-perf
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

for (const f of [
  'src/renderer/src/plugin/pluginMenusCache.ts',
  'src/renderer/src/plugin/pluginSlotCache.ts',
  'src/renderer/src/features/chat/ChatPluginMenusProvider.tsx',
  'src/renderer/src/features/chat/chatVirtualRows.ts',
  'src/renderer/src/features/chat/ChatVirtualMessageList.tsx',
  'docs/specs/005-chat-perf/spec.md'
]) {
  assert.ok(existsSync(join(root, f)), `missing ${f}`)
}

const menusCache = readFileSync(join(root, 'src/renderer/src/plugin/pluginMenusCache.ts'), 'utf8')
assert.match(menusCache, /fetchPluginMenusCached/)
assert.match(menusCache, /invalidatePluginMenusCache/)

const slotCache = readFileSync(join(root, 'src/renderer/src/plugin/pluginSlotCache.ts'), 'utf8')
assert.match(slotCache, /fetchSlotPluginsCached/)

const provider = readFileSync(
  join(root, 'src/renderer/src/features/chat/ChatPluginMenusProvider.tsx'),
  'utf8'
)
assert.match(provider, /ChatPluginMenusProvider/)
assert.match(provider, /fetchPluginMenusCached/)
assert.match(provider, /useChatPluginMenuItems/)

const bubble = readFileSync(join(root, 'src/renderer/src/features/chat/MessageBubble.tsx'), 'utf8')
assert.match(bubble, /useChatPluginMenuItems/)
assert.ok(!bubble.includes('usePluginMenus'), 'MessageBubble must not call usePluginMenus')
assert.ok(!bubble.includes('PluginZoneHost'), 'MessageBubble must not mount PluginZoneHost')
assert.match(bubble, /onBubbleContextMenu/)
assert.match(bubble, /memo\(/)

const hook = readFileSync(join(root, 'src/renderer/src/plugin/usePluginMenus.ts'), 'utf8')
assert.match(hook, /fetchPluginMenusCached/)

const slot = readFileSync(join(root, 'src/renderer/src/plugin/PluginSlot.tsx'), 'utf8')
assert.match(slot, /fetchSlotPluginsCached/)

const chatView = readFileSync(join(root, 'src/renderer/src/features/chat/ChatView.tsx'), 'utf8')
assert.match(chatView, /ChatPluginMenusProvider/)
assert.match(chatView, /ChatVirtualMessageList/)
assert.match(chatView, /handleBubbleContextMenu/)
assert.match(chatView, /zone="context"/)
assert.match(chatView, /Set<string>/)
assert.match(chatView, /messageById={messageById}/)

const pinned = readFileSync(join(root, 'src/renderer/src/features/chat/PinnedMessagesBar.tsx'), 'utf8')
assert.match(pinned, /messageById/)
assert.ok(!pinned.includes('messages:'), 'PinnedMessagesBar must use messageById map')

const virtualList = readFileSync(
  join(root, 'src/renderer/src/features/chat/ChatVirtualMessageList.tsx'),
  'utf8'
)
assert.match(virtualList, /@tanstack\/react-virtual/)
assert.match(virtualList, /useVirtualizer/)

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:chat-perf'], 'missing verify:chat-perf script')
assert.ok(pkg.dependencies?.['@tanstack/react-virtual'], 'missing @tanstack/react-virtual dependency')

console.log('verify:chat-perf OK')
