/**
 * TASK-130 — task_dep_patch 协议与 shared 类型静态校验。
 * Run: npm run verify:task-dep-protocol
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { isTaskDepPatchPayload } from '../../src/shared/task/sync.ts'
import { projectRoot } from '../projectRoot.ts'

const root = projectRoot

const typesSrc = readFileSync(join(root, 'src/shared/network/types.ts'), 'utf8')
const syncSrc = readFileSync(join(root, 'src/shared/task/sync.ts'), 'utf8')
const docsSrc = readFileSync(join(root, 'docs/03_数据模型与协议草案.md'), 'utf8')

assert.match(typesSrc, /'task_dep_patch'/, 'SyncMessageType must include task_dep_patch')
assert.match(syncSrc, /TaskDepPatchPayload/, 'sync.ts must export TaskDepPatchPayload')
assert.match(syncSrc, /isTaskDepPatchPayload/, 'sync.ts must export isTaskDepPatchPayload')
assert.match(docsSrc, /task_dep_patch/, 'docs/03 must document task_dep_patch')
assert.match(docsSrc, /TaskDepPatchPayload/, 'docs/03 must document TaskDepPatchPayload')

assert.ok(
  isTaskDepPatchPayload({
    action: 'upsert',
    groupId: 'g1',
    dependency: { fromTaskId: 'a', toTaskId: 'b', type: 'FS' },
    updatedAt: new Date().toISOString()
  }),
  'runtime guard must accept valid payload'
)

console.log('verify:task-dep-protocol OK')
