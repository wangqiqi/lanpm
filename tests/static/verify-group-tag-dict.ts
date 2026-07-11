/**
 * TASK-194 — group tag dictionary wiring (schema · sync · IPC · UI).
 * Run: npm run verify:group-tag-dict
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  groupTagMetaToColorMap,
  isGroupTagMeta,
  isGroupTagPatchPayload,
  normalizeGroupTagKey
} from '../../src/shared/task/groupTagMeta.ts'
import { SCHEMA_VERSION, EXPECTED_TABLES } from '../../src/main/storage/schema.ts'
import { TASK_IPC, GROUP_TAG_META_PUSH_CHANNEL } from '../../src/shared/task/channels.ts'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')

assert.equal(SCHEMA_VERSION, 6)
assert.ok(EXPECTED_TABLES.includes('group_tag_meta'))

assert.equal(normalizeGroupTagKey('  API '), 'api')
assert.ok(
  isGroupTagMeta({
    groupId: 'g1',
    tagKey: 'api',
    color: '#aabbcc',
    updatedAt: '2026-07-11T00:00:00.000Z'
  })
)
assert.ok(
  isGroupTagPatchPayload({
    action: 'upsert',
    groupId: 'g1',
    tagKey: 'api',
    color: '#112233',
    updatedAt: '2026-07-11T01:00:00.000Z'
  })
)
assert.deepEqual(
  groupTagMetaToColorMap([
    {
      groupId: 'g1',
      tagKey: 'api',
      color: '#aabbcc',
      updatedAt: '2026-07-11T00:00:00.000Z'
    }
  ]),
  { api: '#aabbcc' }
)

assert.equal(TASK_IPC.listGroupTags, 'task:listGroupTags')
assert.equal(TASK_IPC.upsertGroupTag, 'task:upsertGroupTag')
assert.equal(GROUP_TAG_META_PUSH_CHANNEL, 'group:tagMetaChanged')

const schemaSql = readFileSync(join(projectRoot, 'src/main/storage/schema.sql'), 'utf8')
assert.match(schemaSql, /CREATE TABLE group_tag_meta/)

const syncSrc = readFileSync(join(projectRoot, 'src/main/task/groupTagSyncService.ts'), 'utf8')
assert.match(syncSrc, /group_tag_patch/)
assert.match(syncSrc, /importLocalTagColorsIfEmpty/)

const taskSync = readFileSync(join(projectRoot, 'src/main/task/taskSyncService.ts'), 'utf8')
assert.match(taskSync, /group_tag_patch/)
assert.match(taskSync, /handleIncomingGroupTagPatch/)

const palette = readFileSync(
  join(projectRoot, 'src/renderer/src/features/board/BoardTagPalette.tsx'),
  'utf8'
)
assert.match(palette, /useGroupTagStore/)
assert.match(palette, /tagPaletteSyncedHint/)

const store = readFileSync(join(projectRoot, 'src/renderer/src/stores/groupTagStore.ts'), 'utf8')
assert.match(store, /importLocalTagColors/)
assert.match(store, /wireGroupTagPush/)

const types = readFileSync(join(projectRoot, 'src/shared/network/types.ts'), 'utf8')
assert.match(types, /group_tag_patch/)

// SPRINT-FORCE-DICT-TAGS — persist/UI only allow dictionary tags
const tagsShared = readFileSync(join(projectRoot, 'src/shared/task/tags.ts'), 'utf8')
assert.match(tagsShared, /filterTagsToGroupDict/)

const taskService = readFileSync(join(projectRoot, 'src/main/task/taskService.ts'), 'utf8')
assert.match(taskService, /filterTagsToGroupDict/)
assert.match(taskService, /dictFilteredTags/)

const taskRepo = readFileSync(join(projectRoot, 'src/main/storage/repositories/taskRepository.ts'), 'utf8')
assert.match(taskRepo, /coerceTagsForGroup/)
assert.match(taskRepo, /filterTagsToGroupDict/)

const stub = readFileSync(
  join(projectRoot, 'src/renderer/src/platform/browserLanpmStub.ts'),
  'utf8'
)
assert.match(stub, /filterTagsToGroupDict/)

const editModal = readFileSync(
  join(projectRoot, 'src/renderer/src/features/board/TaskEditModal.tsx'),
  'utf8'
)
assert.match(editModal, /mode="multiple"/)
assert.match(editModal, /filterTagsToGroupDict/)
assert.doesNotMatch(editModal, /mode="tags"/)

const detailPanel = readFileSync(
  join(projectRoot, 'src/renderer/src/features/tree/TaskDetailPanel.tsx'),
  'utf8'
)
assert.match(detailPanel, /mode="multiple"/)
assert.match(detailPanel, /filterTagsToGroupDict/)
assert.doesNotMatch(detailPanel, /mode="tags"/)

const zh = readFileSync(join(projectRoot, 'src/renderer/src/i18n/locales/zh-CN.ts'), 'utf8')
assert.match(zh, /board\.tagsEmptyDictHint/)

console.log('verify:group-tag-dict OK (protocol · schema v6 · sync · UI · force-dict)')
