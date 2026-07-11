import { createHash, randomBytes, scryptSync } from 'crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { Database } from 'better-sqlite3'
import type {
  BundleConflictMode,
  GroupBundleEntityCounts,
  GroupBundleImportResult,
  GroupBundlePreviewResult
} from '../../shared/data/bundle.ts'
import { throwLanpm } from '../../shared/errors/lanpmError.ts'
import { sealBytes, openBytes } from '../crypto/envelopeCrypto.ts'
import {
  insertMessage,
  listMessagesByGroup,
  messageExists
} from '../storage/repositories/messageRepository.ts'
import { insertTask, listTasksByGroup } from '../storage/repositories/taskRepository.ts'
import { insertFile, listFilesByGroup } from '../storage/repositories/fileRepository.ts'
import type { ChatMessage } from '../../shared/chat/types.ts'
import type { Task } from '../../shared/task/types.ts'
import type { FileMeta } from '../../shared/file/types.ts'
import { LOCAL_REMOVED_PREFIX, REMOTE_PENDING_PREFIX } from '../../shared/file/sync.ts'

const BUNDLE_VERSION = 1

interface BundlePlain {
  groupId: string
  exportedAt: string
  messages: ChatMessage[]
  tasks: Task[]
  files: FileMeta[]
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
  return { messages: 0, tasks: 0, files: 0 }
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
  includeFileBodies = false
): void {
  const plain: BundlePlain = {
    groupId,
    exportedAt: new Date().toISOString(),
    messages: listMessagesByGroup(db, groupId, 10_000),
    tasks: listTasksByGroup(db, groupId),
    files: listFilesByGroup(db, groupId)
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
}

/** Decrypt-only conflict summary; does not write (TASK-310). */
export function previewGroupBundle(
  db: Database,
  inputPath: string,
  password: string
): GroupBundlePreviewResult {
  const plain = decryptBundle(inputPath, password)
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
  return {
    groupId: plain.groupId,
    exportedAt: plain.exportedAt,
    totals: {
      messages: plain.messages.length,
      tasks: plain.tasks.filter((t) => !t.deletedAt).length,
      files: plain.files.length
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
  const result: GroupBundleImportResult = {
    messagesImported: 0,
    tasksImported: 0,
    filesImported: 0,
    skipped: 0,
    overwritten: 0
  }

  const idMap = new Map<string, string>()

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
        db.prepare(`DELETE FROM tasks WHERE task_id = ?`).run(taskId)
        result.overwritten += 1
      }
    }
    insertTask(db, { ...task, taskId, groupId: task.groupId || plain.groupId })
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
    insertMessage(db, { ...msg, msgId, groupId: msg.groupId || plain.groupId })
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
      const filesRoot = resolveFilesRoot(plain.groupId)
      mkdirSync(filesRoot, { recursive: true })
      storagePath = join(filesRoot, `${fileId}${file.ext ? `.${file.ext.replace(/^\./, '')}` : ''}`)
      writeFileSync(storagePath, Buffer.from(bodyB64, 'base64'))
    }
    insertFile(db, { ...file, fileId, groupId: file.groupId || plain.groupId, storagePath })
    result.filesImported += 1
  }

  return result
}
