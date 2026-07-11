import { createHash, randomBytes, scryptSync } from 'crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { Database } from 'better-sqlite3'
import type {
  BundleChecklistPayload,
  BundleConflictMode,
  BundleCrdtSnapshot,
  GroupBundleEntityCounts,
  GroupBundleExportResult,
  GroupBundleImportResult,
  GroupBundlePreviewResult
} from '../../shared/data/bundle.ts'
import type { GroupMemberRecord } from '../../shared/group/types.ts'
import type { GroupTagMeta } from '../../shared/task/groupTagMeta.ts'
import type { WhiteboardScene } from '../../shared/whiteboard/types.ts'
import { throwLanpm } from '../../shared/errors/lanpmError.ts'
import { sealBytes, openBytes } from '../crypto/envelopeCrypto.ts'
import {
  BUNDLE_MESSAGE_EXPORT_LIMIT,
  insertMessage,
  listMessagesForBundleExport,
  messageExists
} from '../storage/repositories/messageRepository.ts'
import { insertTask, listTasksByGroup } from '../storage/repositories/taskRepository.ts'
import { insertFile, listFilesByGroup } from '../storage/repositories/fileRepository.ts'
import {
  insertGroupMember,
  listGroupMembers
} from '../storage/repositories/groupRepository.ts'
import {
  getGroupTagMeta,
  listGroupTagMeta,
  upsertGroupTagMeta
} from '../storage/repositories/groupTagMetaRepository.ts'
import { listChecklistsByGroup } from '../storage/repositories/checklistRepository.ts'
import {
  getTaskCrdtBlob,
  upsertTaskCrdtBlob
} from '../storage/repositories/taskCrdtRepository.ts'
import {
  getWhiteboardCrdtBlob,
  upsertWhiteboardCrdtBlob
} from '../storage/repositories/whiteboardCrdtRepository.ts'
import {
  getWhiteboardScene,
  upsertWhiteboardScene
} from '../storage/repositories/whiteboardRepository.ts'
import type { ChatMessage } from '../../shared/chat/types.ts'
import type { Task } from '../../shared/task/types.ts'
import type { FileMeta } from '../../shared/file/types.ts'
import { LOCAL_REMOVED_PREFIX, REMOTE_PENDING_PREFIX } from '../../shared/file/sync.ts'

const BUNDLE_VERSION = 1

interface BundlePlain {
  groupId: string
  exportedAt: string
  messages: ChatMessage[]
  /** Present when export hit the message cap (TASK-320). */
  messagesTruncated?: boolean
  messagesTotalInGroup?: number
  messageExportLimit?: number
  tasks: Task[]
  files: FileMeta[]
  tags?: GroupTagMeta[]
  members?: GroupMemberRecord[]
  checklists?: BundleChecklistPayload[]
  taskCrdt?: BundleCrdtSnapshot | null
  whiteboardCrdt?: BundleCrdtSnapshot | null
  whiteboardScene?: WhiteboardScene | null
  fileBodies?: Record<string, string>
}

interface BundleFile {
  version: number
  groupId: string
  exportedAt: string
  kdfSalt: string
  nonce: string
  authTag: string
  ciphertext: string
}

function deriveKey(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, 32)
}

function emptyCounts(): GroupBundleEntityCounts {
  return {
    messages: 0,
    tasks: 0,
    files: 0,
    tags: 0,
    members: 0,
    checklists: 0,
    taskCrdt: 0,
    whiteboardCrdt: 0,
    whiteboardScene: 0
  }
}

function toCrdtSnapshot(
  row: { docId: string; updateBlob: Buffer; updatedAt: string } | null
): BundleCrdtSnapshot | null {
  if (!row) return null
  return {
    docId: row.docId,
    updateBlobB64: row.updateBlob.toString('base64'),
    updatedAt: row.updatedAt
  }
}

function decryptBundle(inputPath: string, password: string): BundlePlain {
  const wrapped = JSON.parse(readFileSync(inputPath, 'utf8')) as BundleFile
  if (wrapped.version !== BUNDLE_VERSION) throwLanpm('err.bundleVersionUnsupported')
  const key = deriveKey(password, Buffer.from(wrapped.kdfSalt, 'base64'))
  const plainBuf = openBytes(
    key,
    Buffer.from(wrapped.ciphertext, 'base64'),
    wrapped.nonce,
    wrapped.authTag
  )
  return JSON.parse(plainBuf.toString('utf8')) as BundlePlain
}

function taskExists(db: Database, taskId: string): boolean {
  return db.prepare(`SELECT 1 FROM tasks WHERE task_id = ?`).get(taskId) !== undefined
}

function fileExists(db: Database, fileId: string): boolean {
  return db.prepare(`SELECT 1 FROM files WHERE file_id = ?`).get(fileId) !== undefined
}

function memberExists(db: Database, groupId: string, userId: string): boolean {
  return (
    db
      .prepare(`SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?`)
      .get(groupId, userId) !== undefined
  )
}

function checklistExistsByTask(db: Database, taskId: string): boolean {
  return db.prepare(`SELECT 1 FROM task_checklists WHERE task_id = ?`).get(taskId) !== undefined
}

function deleteChecklistForTask(db: Database, taskId: string): void {
  db.prepare(`DELETE FROM task_checklist_items WHERE task_id = ?`).run(taskId)
  db.prepare(`DELETE FROM task_checklists WHERE task_id = ?`).run(taskId)
}

function resolveFilesRoot(groupId: string): string {
  // Lazy require: top-level `import { app }` breaks ELECTRON_RUN_AS_NODE verify.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const electron = require('electron') as {
    app?: { getPath: (name: string) => string }
  }
  if (!electron.app?.getPath) {
    throw new Error('Electron app unavailable for bundle file bodies')
  }
  return join(electron.app.getPath('userData'), 'files', groupId)
}

export function exportGroupBundle(
  db: Database,
  groupId: string,
  password: string,
  outputPath: string,
  includeFileBodies = false,
  options?: { messageLimit?: number }
): GroupBundleExportResult {
  const messageLimit = options?.messageLimit ?? BUNDLE_MESSAGE_EXPORT_LIMIT
  const messageExport = listMessagesForBundleExport(db, groupId, messageLimit)
  const plain: BundlePlain = {
    groupId,
    exportedAt: new Date().toISOString(),
    messages: messageExport.messages,
    messagesTruncated: messageExport.truncated || undefined,
    messagesTotalInGroup: messageExport.truncated
      ? messageExport.totalInGroup
      : undefined,
    messageExportLimit: messageExport.truncated ? messageLimit : undefined,
    tasks: listTasksByGroup(db, groupId),
    files: listFilesByGroup(db, groupId),
    tags: listGroupTagMeta(db, groupId),
    members: listGroupMembers(db, groupId),
    checklists: listChecklistsByGroup(db, groupId),
    taskCrdt: toCrdtSnapshot(getTaskCrdtBlob(db, groupId)),
    whiteboardCrdt: toCrdtSnapshot(getWhiteboardCrdtBlob(db, groupId)),
    whiteboardScene: getWhiteboardScene(db, groupId)
  }
  if (includeFileBodies) {
    plain.fileBodies = {}
    for (const f of plain.files) {
      if (
        f.storagePath.startsWith(REMOTE_PENDING_PREFIX) ||
        f.storagePath.startsWith(LOCAL_REMOVED_PREFIX) ||
        !existsSync(f.storagePath)
      ) {
        continue
      }
      plain.fileBodies[f.fileId] = readFileSync(f.storagePath).toString('base64')
    }
  }
  const salt = randomBytes(16)
  const key = deriveKey(password, salt)
  const sealed = sealBytes(key, Buffer.from(JSON.stringify(plain), 'utf8'))
  const out: BundleFile = {
    version: BUNDLE_VERSION,
    groupId,
    exportedAt: plain.exportedAt,
    kdfSalt: salt.toString('base64'),
    nonce: sealed.nonce,
    authTag: sealed.authTag,
    ciphertext: sealed.ciphertext.toString('base64')
  }
  writeFileSync(outputPath, JSON.stringify(out, null, 2), 'utf8')
  return {
    messagesExported: messageExport.messages.length,
    messagesTotalInGroup: messageExport.totalInGroup,
    messagesTruncated: messageExport.truncated,
    messageExportLimit: messageLimit
  }
}

/** Decrypt-only conflict summary; does not write (TASK-310/311). */
export function previewGroupBundle(
  db: Database,
  inputPath: string,
  password: string
): GroupBundlePreviewResult {
  const plain = decryptBundle(inputPath, password)
  const tags = plain.tags ?? []
  const members = plain.members ?? []
  const checklists = plain.checklists ?? []
  const conflicts = emptyCounts()
  for (const task of plain.tasks) {
    if (task.deletedAt) continue
    if (taskExists(db, task.taskId)) conflicts.tasks += 1
  }
  for (const msg of plain.messages) {
    if (messageExists(db, msg.msgId)) conflicts.messages += 1
  }
  for (const file of plain.files) {
    if (fileExists(db, file.fileId)) conflicts.files += 1
  }
  for (const tag of tags) {
    if (getGroupTagMeta(db, plain.groupId, tag.tagKey)) conflicts.tags += 1
  }
  for (const member of members) {
    if (memberExists(db, plain.groupId, member.userId)) conflicts.members += 1
  }
  for (const entry of checklists) {
    const taskId = entry.checklist.taskId
    if (checklistExistsByTask(db, taskId)) conflicts.checklists += 1
  }
  if (plain.taskCrdt && getTaskCrdtBlob(db, plain.groupId)) conflicts.taskCrdt = 1
  if (plain.whiteboardCrdt && getWhiteboardCrdtBlob(db, plain.groupId)) {
    conflicts.whiteboardCrdt = 1
  }
  if (plain.whiteboardScene && getWhiteboardScene(db, plain.groupId)) {
    conflicts.whiteboardScene = 1
  }
  return {
    groupId: plain.groupId,
    exportedAt: plain.exportedAt,
    totals: {
      messages: plain.messages.length,
      tasks: plain.tasks.filter((t) => !t.deletedAt).length,
      files: plain.files.length,
      tags: tags.length,
      members: members.length,
      checklists: checklists.length,
      taskCrdt: plain.taskCrdt ? 1 : 0,
      whiteboardCrdt: plain.whiteboardCrdt ? 1 : 0,
      whiteboardScene: plain.whiteboardScene ? 1 : 0
    },
    conflicts
  }
}

export function importGroupBundle(
  db: Database,
  inputPath: string,
  password: string,
  conflictMode: BundleConflictMode
): GroupBundleImportResult {
  const plain = decryptBundle(inputPath, password)
  const tags = plain.tags ?? []
  const members = plain.members ?? []
  const checklists = plain.checklists ?? []
  const result: GroupBundleImportResult = {
    messagesImported: 0,
    tasksImported: 0,
    filesImported: 0,
    tagsImported: 0,
    membersImported: 0,
    checklistsImported: 0,
    taskCrdtImported: 0,
    whiteboardCrdtImported: 0,
    whiteboardSceneImported: 0,
    skipped: 0,
    overwritten: 0
  }

  const idMap = new Map<string, string>()
  const groupId = plain.groupId

  // Tags before tasks so coerceTagsForGroup can see dictionary entries.
  for (const tag of tags) {
    const exists = !!getGroupTagMeta(db, groupId, tag.tagKey)
    if (exists) {
      if (conflictMode === 'skip' || conflictMode === 'new_id') {
        // tag_key is identity — new_id falls back to skip
        result.skipped += 1
        continue
      }
      result.overwritten += 1
    }
    upsertGroupTagMeta(db, { ...tag, groupId })
    result.tagsImported += 1
  }

  for (const member of members) {
    const exists = memberExists(db, groupId, member.userId)
    if (exists) {
      if (conflictMode === 'skip' || conflictMode === 'new_id') {
        result.skipped += 1
        continue
      }
      result.overwritten += 1
    }
    insertGroupMember(db, { ...member, groupId })
    result.membersImported += 1
  }

  for (const task of plain.tasks) {
    if (task.deletedAt) continue
    let taskId = task.taskId
    const exists = taskExists(db, taskId)
    if (exists) {
      if (conflictMode === 'skip') {
        result.skipped += 1
        continue
      }
      if (conflictMode === 'new_id') {
        taskId = `task_${createHash('sha256').update(taskId + plain.exportedAt).digest('hex').slice(0, 12)}`
        idMap.set(task.taskId, taskId)
      } else if (conflictMode === 'overwrite') {
        deleteChecklistForTask(db, taskId)
        db.prepare(`DELETE FROM tasks WHERE task_id = ?`).run(taskId)
        result.overwritten += 1
      }
    }
    insertTask(db, { ...task, taskId, groupId: task.groupId || groupId })
    result.tasksImported += 1
  }

  for (const msg of plain.messages) {
    let msgId = msg.msgId
    if (messageExists(db, msgId)) {
      if (conflictMode === 'skip') {
        result.skipped += 1
        continue
      }
      if (conflictMode === 'new_id') {
        msgId = `msg_${randomBytes(8).toString('hex')}`
      } else if (conflictMode === 'overwrite') {
        db.prepare(`DELETE FROM messages WHERE msg_id = ?`).run(msgId)
        result.overwritten += 1
      }
    }
    insertMessage(db, { ...msg, msgId, groupId: msg.groupId || groupId })
    result.messagesImported += 1
  }

  for (const file of plain.files) {
    const exists = fileExists(db, file.fileId)
    if (exists && conflictMode === 'skip') {
      result.skipped += 1
      continue
    }
    let fileId = file.fileId
    if (exists && conflictMode === 'new_id') {
      fileId = `file_${randomBytes(8).toString('hex')}`
    } else if (exists && conflictMode === 'overwrite') {
      db.prepare(`DELETE FROM files WHERE file_id = ?`).run(fileId)
      result.overwritten += 1
    }
    let storagePath = file.storagePath
    const bodyB64 = plain.fileBodies?.[file.fileId]
    if (bodyB64) {
      const filesRoot = resolveFilesRoot(groupId)
      mkdirSync(filesRoot, { recursive: true })
      storagePath = join(filesRoot, `${fileId}${file.ext ? `.${file.ext.replace(/^\./, '')}` : ''}`)
      writeFileSync(storagePath, Buffer.from(bodyB64, 'base64'))
    }
    insertFile(db, { ...file, fileId, groupId: file.groupId || groupId, storagePath })
    result.filesImported += 1
  }

  for (const entry of checklists) {
    const taskId = idMap.get(entry.checklist.taskId) ?? entry.checklist.taskId
    let checklistId = entry.checklist.checklistId
    const exists = checklistExistsByTask(db, taskId)
    if (exists) {
      if (conflictMode === 'skip') {
        result.skipped += 1
        continue
      }
      if (conflictMode === 'new_id') {
        // If task wasn't remapped but checklist exists, skip to avoid UNIQUE(task_id)
        if (!idMap.has(entry.checklist.taskId) && taskExists(db, entry.checklist.taskId)) {
          result.skipped += 1
          continue
        }
        checklistId = `cl_${randomBytes(8).toString('hex')}`
      } else if (conflictMode === 'overwrite') {
        deleteChecklistForTask(db, taskId)
        result.overwritten += 1
      }
    } else if (conflictMode === 'new_id' && idMap.has(entry.checklist.taskId)) {
      checklistId = `cl_${randomBytes(8).toString('hex')}`
    }

    db.prepare(
      `INSERT INTO task_checklists (checklist_id, task_id, group_id, title, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      checklistId,
      taskId,
      entry.checklist.groupId || groupId,
      entry.checklist.title,
      entry.checklist.createdAt,
      entry.checklist.updatedAt
    )

    for (const item of entry.items) {
      let itemId = item.itemId
      if (conflictMode === 'new_id') {
        itemId = `cli_${randomBytes(8).toString('hex')}`
      } else if (db.prepare(`SELECT 1 FROM task_checklist_items WHERE item_id = ?`).get(itemId)) {
        if (conflictMode === 'skip') continue
        if (conflictMode === 'overwrite') {
          db.prepare(`DELETE FROM task_checklist_items WHERE item_id = ?`).run(itemId)
        }
      }
      db.prepare(
        `INSERT INTO task_checklist_items (
          item_id, checklist_id, task_id, text, done, sort_order,
          linked_subtask_id, created_at, updated_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`
      ).run(
        itemId,
        checklistId,
        taskId,
        item.text,
        item.done ? 1 : 0,
        item.sortOrder,
        item.linkedSubtaskId ?? null,
        item.createdAt,
        item.updatedAt
      )
    }
    result.checklistsImported += 1
  }

  // Per-group singleton snapshots — new_id falls back to skip.
  if (plain.taskCrdt) {
    const exists = !!getTaskCrdtBlob(db, groupId)
    if (exists) {
      if (conflictMode === 'skip' || conflictMode === 'new_id') {
        result.skipped += 1
      } else {
        upsertTaskCrdtBlob(
          db,
          groupId,
          Buffer.from(plain.taskCrdt.updateBlobB64, 'base64'),
          plain.taskCrdt.updatedAt
        )
        result.overwritten += 1
        result.taskCrdtImported += 1
      }
    } else {
      upsertTaskCrdtBlob(
        db,
        groupId,
        Buffer.from(plain.taskCrdt.updateBlobB64, 'base64'),
        plain.taskCrdt.updatedAt
      )
      result.taskCrdtImported += 1
    }
  }

  if (plain.whiteboardCrdt) {
    const exists = !!getWhiteboardCrdtBlob(db, groupId)
    if (exists) {
      if (conflictMode === 'skip' || conflictMode === 'new_id') {
        result.skipped += 1
      } else {
        upsertWhiteboardCrdtBlob(
          db,
          groupId,
          Buffer.from(plain.whiteboardCrdt.updateBlobB64, 'base64'),
          plain.whiteboardCrdt.updatedAt
        )
        result.overwritten += 1
        result.whiteboardCrdtImported += 1
      }
    } else {
      upsertWhiteboardCrdtBlob(
        db,
        groupId,
        Buffer.from(plain.whiteboardCrdt.updateBlobB64, 'base64'),
        plain.whiteboardCrdt.updatedAt
      )
      result.whiteboardCrdtImported += 1
    }
  }

  if (plain.whiteboardScene) {
    const exists = !!getWhiteboardScene(db, groupId)
    if (exists) {
      if (conflictMode === 'skip' || conflictMode === 'new_id') {
        result.skipped += 1
      } else {
        upsertWhiteboardScene(
          db,
          groupId,
          plain.whiteboardScene.sceneJson,
          plain.whiteboardScene.linkedTaskId ?? null,
          plain.whiteboardScene.updatedAt
        )
        result.overwritten += 1
        result.whiteboardSceneImported += 1
      }
    } else {
      upsertWhiteboardScene(
        db,
        groupId,
        plain.whiteboardScene.sceneJson,
        plain.whiteboardScene.linkedTaskId ?? null,
        plain.whiteboardScene.updatedAt
      )
      result.whiteboardSceneImported += 1
    }
  }

  return result
}
