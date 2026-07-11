/**
 * TASK-310/311 — bundle overwrite + dry-run + tags/members/checklists.
 * Run: npm run verify:bundle
 */
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { readFileSync } from 'node:fs'
import Database from 'better-sqlite3'
import { applyMigrations } from '../../src/main/storage/migrate.ts'
import {
  exportGroupBundle,
  importGroupBundle,
  previewGroupBundle
} from '../../src/main/data/bundleService.ts'
import {
  insertGroup,
  insertGroupMember,
  listGroupMembers
} from '../../src/main/storage/repositories/groupRepository.ts'
import { upsertUser } from '../../src/main/storage/repositories/userRepository.ts'
import { upsertDevice } from '../../src/main/storage/repositories/deviceRepository.ts'
import { setMeta } from '../../src/main/storage/repositories/syncMetaRepository.ts'
import {
  insertTask,
  getTaskById,
  buildTaskFromInput
} from '../../src/main/storage/repositories/taskRepository.ts'
import { insertMessage, getMessageById } from '../../src/main/storage/repositories/messageRepository.ts'
import { insertFile } from '../../src/main/storage/repositories/fileRepository.ts'
import {
  listGroupTagMeta,
  upsertGroupTagMeta
} from '../../src/main/storage/repositories/groupTagMetaRepository.ts'
import { listChecklistsByGroup } from '../../src/main/storage/repositories/checklistRepository.ts'
import type { ChatMessage } from '../../src/shared/chat/types.ts'
import type { FileMeta } from '../../src/shared/file/types.ts'
import { mkLanpmTemp, rmLanpmTemp } from '../lanpmTemp.ts'
import { projectRoot } from '../projectRoot.ts'

const GROUP = 'g-bundle-310'
const USER = 'u-bundle'
const DEVICE = 'd-bundle'
const PASS = 'test-pass'

const bundleSrc = readFileSync(join(projectRoot, 'src/main/data/bundleService.ts'), 'utf8')
assert.match(bundleSrc, /conflictMode === 'overwrite'/)
assert.match(bundleSrc, /export function previewGroupBundle/)
assert.match(bundleSrc, /listGroupTagMeta/)
assert.match(bundleSrc, /listGroupMembers/)
assert.match(bundleSrc, /listChecklistsByGroup/)

const sharedSrc = readFileSync(join(projectRoot, 'src/shared/data/bundle.ts'), 'utf8')
assert.match(sharedSrc, /tagsImported/)
assert.match(sharedSrc, /checklists/)

function openDb(dir: string): Database.Database {
  const db = new Database(join(dir, 'lanpm.db'))
  db.pragma('foreign_keys = ON')
  applyMigrations(db)
  const now = new Date().toISOString()
  upsertUser(db, {
    userId: USER,
    displayName: 'Bundle User',
    baseName: 'Bundle',
    suffix: 1,
    createdAt: now,
    updatedAt: now
  })
  upsertDevice(db, { deviceId: DEVICE, deviceName: 'verify', userId: USER, lastSeenAt: now })
  setMeta(db, 'local_device_id', DEVICE)
  insertGroup(db, {
    groupId: GROUP,
    type: 'project',
    name: 'Bundle Group',
    createdBy: USER,
    createdAt: now,
    autoDiscover: true
  })
  return db
}

function seedEntities(db: Database.Database, title: string, text: string, tagColor: string): void {
  const now = new Date().toISOString()
  upsertGroupTagMeta(db, {
    groupId: GROUP,
    tagKey: 'prio',
    color: tagColor,
    updatedAt: now,
    updatedByUserId: USER
  })
  insertGroupMember(db, {
    groupId: GROUP,
    userId: USER,
    role: 'owner',
    joinedAt: now,
    displayAlias: title === 'Original title' ? 'OwnerA' : 'OwnerB'
  })

  const task = buildTaskFromInput(
    { groupId: GROUP, title, status: 'todo' },
    USER,
    'task_bundle_1'
  )
  task.createdAt = now
  task.updatedAt = now
  insertTask(db, task)

  db.prepare(
    `INSERT INTO task_checklists (checklist_id, task_id, group_id, title, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run('cl_bundle_1', 'task_bundle_1', GROUP, 'CL', now, now)
  db.prepare(
    `INSERT INTO task_checklist_items (
      item_id, checklist_id, task_id, text, done, sort_order,
      linked_subtask_id, created_at, updated_at, deleted_at
    ) VALUES (?, ?, ?, ?, 0, 0, NULL, ?, ?, NULL)`
  ).run('cli_bundle_1', 'cl_bundle_1', 'task_bundle_1', text, now, now)

  const msg: ChatMessage = {
    msgId: 'msg_bundle_1',
    groupId: GROUP,
    senderUserId: USER,
    senderDeviceId: DEVICE,
    type: 'text',
    content: { kind: 'text', text },
    lamportTs: 1,
    createdAt: now,
    deliveryStatus: 'sent'
  }
  insertMessage(db, msg)

  const file: FileMeta = {
    fileId: 'file_bundle_1',
    groupId: GROUP,
    name: 'note.txt',
    ext: 'txt',
    category: 'document',
    size: 4,
    uploadedBy: USER,
    uploadedAt: now,
    sha256: 'abc',
    storagePath: '/tmp/lanpm-bundle-note.txt',
    previewStatus: 'none',
    isBookmark: false,
    updatedAt: now
  }
  insertFile(db, file)
}

const dirA = mkLanpmTemp('lanpm-bundle-a-')
const dirB = mkLanpmTemp('lanpm-bundle-b-')
try {
  const dbA = openDb(dirA)
  seedEntities(dbA, 'Original title', 'hello', '#112233')
  const bundlePath = join(dirA, 'group.lanpm-bundle.json')
  exportGroupBundle(dbA, GROUP, PASS, bundlePath, false)

  const dbB = openDb(dirB)
  seedEntities(dbB, 'Local title', 'local', '#AABBCC')

  const preview = previewGroupBundle(dbB, bundlePath, PASS)
  assert.equal(preview.groupId, GROUP)
  assert.equal(preview.totals.tasks, 1)
  assert.equal(preview.totals.messages, 1)
  assert.equal(preview.totals.files, 1)
  assert.equal(preview.totals.tags, 1)
  assert.equal(preview.totals.members, 1)
  assert.equal(preview.totals.checklists, 1)
  assert.equal(preview.conflicts.tasks, 1)
  assert.equal(preview.conflicts.tags, 1)
  assert.equal(preview.conflicts.members, 1)
  assert.equal(preview.conflicts.checklists, 1)

  const skipped = importGroupBundle(dbB, bundlePath, PASS, 'skip')
  assert.ok(skipped.skipped >= 6)
  assert.equal(skipped.tasksImported, 0)
  assert.equal(getTaskById(dbB, 'task_bundle_1')?.title, 'Local title')
  assert.equal(listGroupTagMeta(dbB, GROUP)[0]?.color, '#AABBCC')

  const overwritten = importGroupBundle(dbB, bundlePath, PASS, 'overwrite')
  // checklist may be deleted with task overwrite then re-inserted (no overwritten++)
  assert.ok(overwritten.overwritten >= 5, `overwritten=${overwritten.overwritten}`)
  assert.equal(overwritten.tasksImported, 1)
  assert.equal(overwritten.tagsImported, 1)
  assert.equal(overwritten.membersImported, 1)
  assert.equal(overwritten.checklistsImported, 1)
  assert.equal(getTaskById(dbB, 'task_bundle_1')?.title, 'Original title')
  assert.equal(listGroupTagMeta(dbB, GROUP)[0]?.color, '#112233')
  assert.equal(listGroupMembers(dbB, GROUP)[0]?.displayAlias, 'OwnerA')
  const cls = listChecklistsByGroup(dbB, GROUP)
  assert.equal(cls.length, 1)
  assert.equal(cls[0]?.items[0]?.text, 'hello')

  const msg = getMessageById(dbB, 'msg_bundle_1')
  assert.ok(msg)
  assert.equal(msg.content.kind, 'text')
  if (msg.content.kind === 'text') assert.equal(msg.content.text, 'hello')

  const dirC = mkLanpmTemp('lanpm-bundle-c-')
  try {
    const dbC = openDb(dirC)
    const fresh = importGroupBundle(dbC, bundlePath, PASS, 'skip')
    assert.equal(fresh.skipped, 0)
    assert.equal(fresh.tasksImported, 1)
    assert.equal(fresh.tagsImported, 1)
    assert.equal(fresh.membersImported, 1)
    assert.equal(fresh.checklistsImported, 1)
    assert.equal(fresh.overwritten, 0)
    dbC.close()
  } finally {
    rmLanpmTemp(dirC)
  }

  dbA.close()
  dbB.close()
  console.log('OK: verify:bundle — overwrite + dry-run + tags/members/checklists')
} finally {
  rmLanpmTemp(dirA)
  rmLanpmTemp(dirB)
}
