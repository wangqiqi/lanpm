/**
 * TASK-1154 — DM preview IPC guards.
 * Run: npm run verify:dm-preview-ipc
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

assert.ok(existsSync(join(root, 'src/shared/chat/dmPreview.ts')))
assert.ok(existsSync(join(root, 'src/renderer/src/features/chat/dmPreviewStore.ts')))
assert.ok(existsSync(join(root, 'src/renderer/src/features/chat/useDmPreviews.ts')))

const channels = readFileSync(join(root, 'src/shared/chat/channels.ts'), 'utf8')
assert.match(channels, /listDmPreviews:\s*'chat:listDmPreviews'/)

const ipc = readFileSync(join(root, 'src/main/ipc/chat.ts'), 'utf8')
assert.match(ipc, /CHAT_IPC\.listDmPreviews/)
assert.match(ipc, /listDmPreviews\(getDatabase\(\)\)/)

const repo = readFileSync(
  join(root, 'src/main/storage/repositories/messageRepository.ts'),
  'utf8'
)
assert.match(repo, /listDmMessagePreviews/)

const dmBar = readFileSync(join(root, 'src/renderer/src/features/chat/DmSessionBar.tsx'), 'utf8')
assert.match(dmBar, /useDmPreviewStore/)
assert.match(dmBar, /useDmPreviews/)
assert.ok(
  !dmBar.includes('messagesByGroup[session.groupId]'),
  'DmSessionRow must not subscribe messagesByGroup'
)

const stub = readFileSync(join(root, 'src/renderer/src/platform/browserLanpmStub.ts'), 'utf8')
assert.match(stub, /listDmPreviews/)

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:dm-preview-ipc'], 'missing verify:dm-preview-ipc script')

console.log('verify:dm-preview-ipc OK')
