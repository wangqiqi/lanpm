/**
 * TASK-310 — bundle overwrite + dry-run preview.
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
import { insertGroup } from '../../src/main/storage/repositories/groupRepository.ts'
import { upsertUser } from '../../src/main/storage/repositories/userRepository.ts'
import { upsertDevice } from '../../src/main/storage/repositories/deviceRepository.ts'
import { setMeta } from '../../src/main/storage/repositories/syncMetaRepository.ts'
import { insertTask, getTaskById } from '../../src/main/storage/repositories/taskRepository.ts'
import { insertMessage, getMessageById } from '../../src/main/storage/repositories/messageRepository.ts'
import { insertFile } from '../../src/main/storage/repositories/fileRepository.ts'
import { buildTaskFromInput } from '../../src/main/storage/repositories/taskRepository.ts'
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
assert.match(bundleSrc, /overwritten/)

const channelsSrc = readFileSync(join(projectRoot, 'src/shared/data/channels.ts'), 'utf8')
assert.match(channelsSrc, /previewGroupBundle/)

const sharedSrc = readFileSync(join(projectRoot, 'src/shared/data/bundle.ts'), 'utf8')
assert.match(sharedSrc, /GroupBundlePreviewResult/)
assert.match(sharedSrc, /overwritten/)

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

function seedEntities(db: Database.Database, title: string, text: string): void {
  const now = new Date().toISOString()
  const task = buildTaskFromInput(
    { groupId: GROUP, title, status: 'todo' },
    USER,
    'task_bundle_1'
  )
  task.createdAt = now
  task.updatedAt = now
  insertTask(db, task)

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
  seedEntities(dbA, 'Original title', 'hello')
  const bundlePath = join(dirA, 'group.lanpm-bundle.json')
  exportGroupBundle(dbA, GROUP, PASS, bundlePath, false)

  const dbB = openDb(dirB)
  seedEntities(dbB, 'Local title', 'local')

  const preview = previewGroupBundle(dbB, bundlePath, PASS)
  assert.equal(preview.groupId, GROUP)
  assert.equal(preview.totals.tasks, 1)
  assert.equal(preview.totals.messages, 1)
  assert.equal(preview.totals.files, 1)
  assert.equal(preview.conflicts.tasks, 1)
  assert.equal(preview.conflicts.messages, 1)
  assert.equal(preview.conflicts.files, 1)

  const skipped = importGroupBundle(dbB, bundlePath, PASS, 'skip')
  assert.equal(skipped.skipped, 3)
  assert.equal(skipped.tasksImported, 0)
  assert.equal(getTaskById(dbB, 'task_bundle_1')?.title, 'Local title')

  const overwritten = importGroupBundle(dbB, bundlePath, PASS, 'overwrite')
  assert.equal(overwritten.overwritten, 3)
  assert.equal(overwritten.tasksImported, 1)
  assert.equal(overwritten.messagesImported, 1)
  assert.equal(overwritten.filesImported, 1)
  assert.equal(getTaskById(dbB, 'task_bundle_1')?.title, 'Original title')
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
    assert.equal(fresh.messagesImported, 1)
    assert.equal(fresh.filesImported, 1)
    assert.equal(fresh.overwritten, 0)
    dbC.close()
  } finally {
    rmLanpmTemp(dirC)
  }

  dbA.close()
  dbB.close()
  console.log('OK: verify:bundle — overwrite + dry-run preview')
} finally {
  rmLanpmTemp(dirA)
  rmLanpmTemp(dirB)
}
