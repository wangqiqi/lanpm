/**
 * AUTO-09 — SyncEnvelope.type 在 main 层有 handler 或 post-RC 登记。
 * Run: npm run verify:sync-handlers
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { projectRoot } from '../projectRoot.ts'

const root = projectRoot

const SYNC_TYPES = [
  'discovery',
  'heartbeat',
  'chat',
  'read_receipt',
  'task_patch',
  'task_crdt',
  'file_meta',
  'file_pull_request',
  'file_chunk',
  'member_event',
  'group_key_rotate',
  'chat_sync_request',
  'chat_sync_batch'
] as const

/** post-RC / transport-level — 允许仅在文档或 transport 出现 */
const POST_RC_OR_TRANSPORT = new Set<string>([
  'discovery',
  'heartbeat',
  'task_crdt',
  'member_event'
])

const HANDLER_FILES = [
  'src/main/chat/chatService.ts',
  'src/main/chat/readReceiptService.ts',
  'src/main/chat/offlineSyncService.ts',
  'src/main/task/taskSyncService.ts',
  'src/main/file/fileSyncService.ts',
  'src/main/crypto/groupKeyService.ts',
  'src/main/network/stub/NetworkStub.ts',
  'src/main/network/real/RealNetworkTransport.ts'
]

const corpus = HANDLER_FILES.map((rel) => readFileSync(join(root, rel), 'utf8')).join('\n')

for (const type of SYNC_TYPES) {
  const pattern = new RegExp(`['"]${type}['"]|type === '${type}'|type !== '${type}'`)
  if (POST_RC_OR_TRANSPORT.has(type)) {
    const inTransport =
      readFileSync(join(root, 'src/main/network/stub/NetworkStub.ts'), 'utf8').includes(type) ||
      readFileSync(join(root, 'src/main/network/real/RealNetworkTransport.ts'), 'utf8').includes(
        type
      ) ||
      readFileSync(join(root, 'src/shared/network/types.ts'), 'utf8').includes(`'${type}'`)
    assert.ok(inTransport, `transport/doc reference missing for ${type}`)
    continue
  }
  assert.ok(pattern.test(corpus), `no handler reference for sync type: ${type}`)
}

console.log(`verify:sync-handlers OK (${SYNC_TYPES.length} types checked)`)
