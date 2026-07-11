/**
 * TASK-333 — chat sync fire-and-forget 须走 catchSyncFailure，禁止裸吞。
 * Run: node --experimental-strip-types tests/static/verify-chat-sync-observability.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { projectRoot } from '../projectRoot.ts'

const root = projectRoot
const files = ['src/main/chat/chatService.ts', 'src/main/chat/offlineSyncService.ts'] as const

for (const rel of files) {
  const src = readFileSync(join(root, rel), 'utf8')
  assert.match(src, /catchSyncFailure/, `${rel} must import/use catchSyncFailure`)
  assert.doesNotMatch(
    src,
    /\.catch\(\(\)\s*=>\s*undefined\)/,
    `${rel} must not swallow errors with catch(() => undefined)`
  )
}

const helper = readFileSync(join(root, 'src/main/utils/reportSyncFailure.ts'), 'utf8')
assert.match(helper, /console\.warn/, 'reportSyncFailure must log via console.warn')
assert.match(helper, /export function catchSyncFailure/, 'catchSyncFailure export required')

console.log('verify:chat-sync-observability OK')
