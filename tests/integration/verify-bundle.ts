/**
 * TASK-310/311/320 — bundle overwrite + dry-run + multi-entity + newest-first message export.
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
  buildTaskFromInput,
  listTasksByGroup
} from '../../src/main/storage/repositories/taskRepository.ts'
import {
  insertMessage,
  getMessageById,
  listMessagesForBundleExport
} from '../../src/main/storage/repositories/messageRepository.ts'
import { insertFile } from '../../src/main/storage/repositories/fileRepository.ts'
import {
  listGroupTagMeta,
  upsertGroupTagMeta
} from '../../src/main/storage/repositories/groupTagMetaRepository.ts'
import { listChecklistsByGroup } from '../../src/main/storage/repositories/checklistRepository.ts'
import {
  getTaskCrdtBlob,
  upsertTaskCrdtBlob
} from '../../src/main/storage/repositories/taskCrdtRepository.ts'
import {
  getWhiteboardCrdtBlob,
  upsertWhiteboardCrdtBlob
} from '../../src/main/storage/repositories/whiteboardCrdtRepository.ts'
import {
  getWhiteboardScene,
  upsertWhiteboardScene
} from '../../src/main/storage/repositories/whiteboardRepository.ts'
import { emptyWhiteboardSceneJson } from '../../src/shared/whiteboard/types.ts'
import type { ChatMessage } from '../../src/shared/chat/types.ts'
import type { FileMeta } from '../../src/shared/file/types.ts'
import { mkLanpmTemp, rmLanpmTemp } from '../lanpmTemp.ts'
import { projectRoot } from '../projectRoot.ts'

const GROUP = 'g-bundle-310'
const USER = 'u-bundle'
const DEVICE = 'd-bundle'
const PASS = 'test-pass'

const bundleSrc = readFileSync(join(projectRoot, 'src/main/data/bundleService.ts'), 'utf8')
assert.match(bundleSrc, /mode === 'overwrite'/)
assert.match(bundleSrc, /export function previewGroupBundle/)
assert.match(bundleSrc, /listGroupTagMeta/)
assert.match(bundleSrc, /listGroupMembers/)
assert.match(bundleSrc, /listChecklistsByGroup/)
assert.match(bundleSrc, /getTaskCrdtBlob/)
assert.match(bundleSrc, /getWhiteboardCrdtBlob/)
assert.match(bundleSrc, /getWhiteboardScene/)
assert.match(bundleSrc, /listMessagesForBundleExport/)
assert.match(bundleSrc, /messagesTruncated/)
assert.match(bundleSrc, /taskIdMap/)
assert.match(bundleSrc, /remapId\(taskIdMap/)
assert.match(bundleSrc, /linkedFileIds: remapIds/)

const msgRepoSrc = readFileSync(
  join(projectRoot, 'src/main/storage/repositories/messageRepository.ts'),
  'utf8'
)
assert.match(msgRepoSrc, /ORDER BY lamport_ts DESC, created_at DESC/)
assert.match(msgRepoSrc, /export function listMessagesForBundleExport/)

const sharedSrc = readFileSync(join(projectRoot, 'src/shared/data/bundle.ts'), 'utf8')
assert.match(sharedSrc, /tagsImported/)
assert.match(sharedSrc, /taskCrdt/)
assert.match(sharedSrc, /BundleCrdtSnapshot/)
assert.match(sharedSrc, /GroupBundleExportResult/)
assert.match(sharedSrc, /messagesTruncated/)
assert.match(sharedSrc, /assertBundleConflictMode/)
assert.match(sharedSrc, /BUNDLE_PASSWORD_MIN_LENGTH/)

const ipcSrc = readFileSync(join(projectRoot, 'src/main/ipc/data.ts'), 'utf8')
assert.match(ipcSrc, /assertBundleConflictMode/)
assert.match(ipcSrc, /assertBundlePassword/)

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

  upsertTaskCrdtBlob(db, GROUP, Buffer.from(`task-crdt-${tagColor}`), now)
  upsertWhiteboardCrdtBlob(db, GROUP, Buffer.from(`wb-crdt-${tagColor}`), now)
  upsertWhiteboardScene(db, GROUP, emptyWhiteboardSceneJson(), null, now)
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
  assert.equal(preview.totals.taskCrdt, 1)
  assert.equal(preview.totals.whiteboardCrdt, 1)
  assert.equal(preview.totals.whiteboardScene, 1)
  assert.equal(preview.conflicts.tasks, 1)
  assert.equal(preview.conflicts.tags, 1)
  assert.equal(preview.conflicts.members, 1)
  assert.equal(preview.conflicts.checklists, 1)
  assert.equal(preview.conflicts.taskCrdt, 1)
  assert.equal(preview.conflicts.whiteboardCrdt, 1)
  assert.equal(preview.conflicts.whiteboardScene, 1)

  const skipped = importGroupBundle(dbB, bundlePath, PASS, 'skip')
  assert.ok(skipped.skipped >= 9)
  assert.equal(skipped.tasksImported, 0)
  assert.equal(getTaskById(dbB, 'task_bundle_1')?.title, 'Local title')
  assert.equal(listGroupTagMeta(dbB, GROUP)[0]?.color, '#AABBCC')
  assert.equal(getTaskCrdtBlob(dbB, GROUP)?.updateBlob.toString(), 'task-crdt-#AABBCC')

  const overwritten = importGroupBundle(dbB, bundlePath, PASS, 'overwrite')
  // checklist may be deleted with task overwrite then re-inserted (no overwritten++)
  assert.ok(overwritten.overwritten >= 8, `overwritten=${overwritten.overwritten}`)
  assert.equal(overwritten.tasksImported, 1)
  assert.equal(overwritten.tagsImported, 1)
  assert.equal(overwritten.membersImported, 1)
  assert.equal(overwritten.checklistsImported, 1)
  assert.equal(overwritten.taskCrdtImported, 1)
  assert.equal(overwritten.whiteboardCrdtImported, 1)
  assert.equal(overwritten.whiteboardSceneImported, 1)
  assert.equal(getTaskById(dbB, 'task_bundle_1')?.title, 'Original title')
  assert.equal(listGroupTagMeta(dbB, GROUP)[0]?.color, '#112233')
  assert.equal(listGroupMembers(dbB, GROUP)[0]?.displayAlias, 'OwnerA')
  assert.equal(getTaskCrdtBlob(dbB, GROUP)?.updateBlob.toString(), 'task-crdt-#112233')
  assert.equal(getWhiteboardCrdtBlob(dbB, GROUP)?.updateBlob.toString(), 'wb-crdt-#112233')
  assert.ok(getWhiteboardScene(dbB, GROUP))
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
    assert.equal(fresh.taskCrdtImported, 1)
    assert.equal(fresh.whiteboardCrdtImported, 1)
    assert.equal(fresh.whiteboardSceneImported, 1)
    assert.equal(fresh.overwritten, 0)
    dbC.close()
  } finally {
    rmLanpmTemp(dirC)
  }

  dbA.close()
  dbB.close()
  console.log('OK: verify:bundle — overwrite + dry-run + multi-entity + CRDT snapshots')

  // TASK-321: password floor + conflictMode whitelist + import transaction rollback
  const dirV = mkLanpmTemp('lanpm-bundle-validate-')
  try {
    const dbV = openDb(dirV)
    const badPath = join(dirV, 'nope.lanpm-bundle.json')
    assert.throws(
      () => exportGroupBundle(dbV, GROUP, 'ab', badPath, false),
      /password/i
    )
    assert.throws(
      () =>
        importGroupBundle(
          dbV,
          badPath,
          PASS,
          'merge' as unknown as import('../../src/shared/data/bundle.ts').BundleConflictMode
        ),
      /conflictMode/i
    )

    seedEntities(dbV, 'Before txn', 'hello', '#111111')
    const goodPath = join(dirV, 'good.lanpm-bundle.json')
    exportGroupBundle(dbV, GROUP, PASS, goodPath, false)
    dbV.close()

    const dirR2 = mkLanpmTemp('lanpm-bundle-rollback2-')
    try {
      const dbR2 = openDb(dirR2)
      dbR2.exec(`
        CREATE TRIGGER fail_task_insert
        BEFORE INSERT ON tasks
        BEGIN
          SELECT RAISE(ABORT, 'forced_rollback');
        END;
      `)
      assert.throws(() => importGroupBundle(dbR2, goodPath, PASS, 'skip'), /forced_rollback/)
      assert.equal(getTaskById(dbR2, 'task_bundle_1'), null)
      assert.equal(getMessageById(dbR2, 'msg_bundle_1'), null)
      dbR2.close()
      console.log('OK: verify:bundle — TASK-321 password/mode + transaction rollback')
    } finally {
      rmLanpmTemp(dirR2)
    }
  } finally {
    rmLanpmTemp(dirV)
  }

  // TASK-322: new_id remaps parentTaskId + linkedFileIds
  const dirN = mkLanpmTemp('lanpm-bundle-newid-')
  try {
    const dbN = openDb(dirN)
    const now = new Date().toISOString()
    const parent = buildTaskFromInput(
      { groupId: GROUP, title: 'Parent', status: 'todo' },
      USER,
      'task_parent'
    )
    parent.createdAt = now
    parent.updatedAt = now
    insertTask(dbN, parent)
    const child = buildTaskFromInput(
      {
        groupId: GROUP,
        title: 'Child',
        status: 'todo',
        parentTaskId: 'task_parent',
        linkedFileIds: ['file_link_1'],
        sourceMsgId: 'msg_link_1'
      },
      USER,
      'task_child'
    )
    child.createdAt = now
    child.updatedAt = now
    insertTask(dbN, child)
    insertMessage(dbN, {
      msgId: 'msg_link_1',
      groupId: GROUP,
      senderUserId: USER,
      senderDeviceId: DEVICE,
      type: 'text',
      content: { kind: 'text', text: 'src' },
      lamportTs: 1,
      createdAt: now,
      deliveryStatus: 'sent'
    })
    insertFile(dbN, {
      fileId: 'file_link_1',
      groupId: GROUP,
      name: 'a.txt',
      ext: 'txt',
      category: 'document',
      size: 1,
      uploadedBy: USER,
      uploadedAt: now,
      sha256: 'x',
      storagePath: '/tmp/a.txt',
      previewStatus: 'none',
      isBookmark: false,
      updatedAt: now
    })
    const newIdPath = join(dirN, 'newid.lanpm-bundle.json')
    exportGroupBundle(dbN, GROUP, PASS, newIdPath, false)

    const dirN2 = mkLanpmTemp('lanpm-bundle-newid2-')
    try {
      const dbN2 = openDb(dirN2)
      // Conflict on same primary IDs
      insertTask(dbN2, { ...parent, title: 'Local parent' })
      insertTask(dbN2, { ...child, title: 'Local child' })
      insertMessage(dbN2, {
        msgId: 'msg_link_1',
        groupId: GROUP,
        senderUserId: USER,
        senderDeviceId: DEVICE,
        type: 'text',
        content: { kind: 'text', text: 'local' },
        lamportTs: 1,
        createdAt: now,
        deliveryStatus: 'sent'
      })
      insertFile(dbN2, {
        fileId: 'file_link_1',
        groupId: GROUP,
        name: 'b.txt',
        ext: 'txt',
        category: 'document',
        size: 1,
        uploadedBy: USER,
        uploadedAt: now,
        sha256: 'y',
        storagePath: '/tmp/b.txt',
        previewStatus: 'none',
        isBookmark: false,
        updatedAt: now
      })

      const imported = importGroupBundle(dbN2, newIdPath, PASS, 'new_id')
      assert.ok(imported.tasksImported >= 2)
      const tasks = listTasksByGroup(dbN2, GROUP)
      const remappedParent = tasks.find((t) => t.title === 'Parent')
      const remappedChild = tasks.find((t) => t.title === 'Child')
      assert.ok(remappedParent)
      assert.ok(remappedChild)
      assert.notEqual(remappedParent.taskId, 'task_parent')
      assert.notEqual(remappedChild.taskId, 'task_child')
      assert.equal(remappedChild.parentTaskId, remappedParent.taskId)
      assert.ok(remappedChild.linkedFileIds?.[0])
      assert.notEqual(remappedChild.linkedFileIds?.[0], 'file_link_1')
      assert.ok(remappedChild.sourceMsgId)
      assert.notEqual(remappedChild.sourceMsgId, 'msg_link_1')
      // originals still present
      assert.equal(getTaskById(dbN2, 'task_parent')?.title, 'Local parent')
      dbN2.close()
      console.log('OK: verify:bundle — TASK-322 new_id FK remap')
    } finally {
      rmLanpmTemp(dirN2)
    }
    dbN.close()
  } finally {
    rmLanpmTemp(dirN)
  }

  // TASK-320: newest-first export under a small limit (drops oldest, keeps newest)
  const dirT = mkLanpmTemp('lanpm-bundle-trunc-')
  try {
    const dbT = openDb(dirT)
    const now = new Date().toISOString()
    for (let i = 1; i <= 5; i++) {
      insertMessage(dbT, {
        msgId: `msg_trunc_${i}`,
        groupId: GROUP,
        senderUserId: USER,
        senderDeviceId: DEVICE,
        type: 'text',
        content: { kind: 'text', text: `m${i}` },
        lamportTs: i,
        createdAt: now,
        deliveryStatus: 'sent'
      })
    }
    const page = listMessagesForBundleExport(dbT, GROUP, 3)
    assert.equal(page.totalInGroup, 5)
    assert.equal(page.truncated, true)
    assert.equal(page.messages.length, 3)
    assert.deepEqual(
      page.messages.map((m) => m.msgId),
      ['msg_trunc_3', 'msg_trunc_4', 'msg_trunc_5']
    )

    const truncPath = join(dirT, 'trunc.lanpm-bundle.json')
    const meta = exportGroupBundle(dbT, GROUP, PASS, truncPath, false, { messageLimit: 3 })
    assert.equal(meta.messagesTruncated, true)
    assert.equal(meta.messagesExported, 3)
    assert.equal(meta.messagesTotalInGroup, 5)
    assert.equal(meta.messageExportLimit, 3)
    dbT.close()
    console.log('OK: verify:bundle — TASK-320 newest-first truncation')
  } finally {
    rmLanpmTemp(dirT)
  }
} finally {
  rmLanpmTemp(dirA)
  rmLanpmTemp(dirB)
}
