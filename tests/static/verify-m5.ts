/**
 * M5 group guards + cockpit types smoke + FilesView P1/P2 layout guards.
 * Run: npm run verify:m5
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  assertGroupAllowsFiles,
  assertGroupAllowsTasks,
  isAnonymousGroupType
} from '../../src/shared/group/guards.ts'
import type { GroupRecord } from '../../src/shared/group/types.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const filesView = readFileSync(
  join(root, 'src/renderer/src/features/files/FilesView.tsx'),
  'utf8'
)
assert.match(filesView, /styles\.transferPanel/)
assert.match(filesView, /styles\.rateLimitRow/)
assert.match(filesView, /files\.bookmarkMore/)
assert.match(filesView, /files\.emptySearch/)
assert.match(filesView, /files\.bookmarkPreviewHint/)
const toolbarEnd = filesView.indexOf('end={')
const transferPanel = filesView.indexOf('styles.transferPanel')
const rateInToolbarWindow = filesView.slice(toolbarEnd, transferPanel)
assert.ok(
  !rateInToolbarWindow.includes('rateLimitKbps'),
  'rate limit must not live in ViewToolbar end (SPRINT-FILES-P1)'
)
assert.match(filesView, /styles\.rowBookmark/)
assert.match(filesView, /files\.bookmarkRowTag/)
assert.match(filesView, /files\.bookmarkTypeShort/)
assert.ok(
  !filesView.includes("if (r.isBookmark) return t('common.link')"),
  'bookmark preview column must not use common.link noise (SPRINT-FILES-BOOKMARK-UX)'
)

assert.equal(isAnonymousGroupType('anonymous'), true)
assert.equal(isAnonymousGroupType('project'), false)

assert.throws(() => assertGroupAllowsTasks('anonymous'), /stub\.anonymousNoTask/)
assert.throws(() => assertGroupAllowsTasks('function'), /stub\.functionNoTask/)
assert.doesNotThrow(() => assertGroupAllowsTasks('project'))

assert.throws(() => assertGroupAllowsFiles('anonymous'), /err\.anonymousNoFile/)
assert.doesNotThrow(() => assertGroupAllowsFiles('project'))
assert.doesNotThrow(() => assertGroupAllowsFiles('project', 'dm:u1__u2'))

const sampleGroup: GroupRecord = {
  groupId: 'g1',
  type: 'project',
  name: 'Demo',
  createdBy: 'u1',
  createdAt: '2026-01-01T00:00:00.000Z',
  autoDiscover: true
}
assert.equal(sampleGroup.type, 'project')

console.log('verify-m5: ok')
