import { createHash, randomBytes, scryptSync } from 'crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import type { Database } from 'better-sqlite3'
import type {
  BundleConflictMode,
  GroupBundleImportResult
} from '../../shared/data/bundle'
import { sealBytes, openBytes } from '../crypto/envelopeCrypto'
import { listMessagesByGroup } from '../storage/repositories/messageRepository'
import { listTasksByGroup } from '../storage/repositories/taskRepository'
import { listFilesByGroup } from '../storage/repositories/fileRepository'
import { insertMessage, messageExists } from '../storage/repositories/messageRepository'
import { insertTask } from '../storage/repositories/taskRepository'
import { insertFile } from '../storage/repositories/fileRepository'
import type { ChatMessage } from '../../shared/chat/types'
import type { Task } from '../../shared/task/types'
import type { FileMeta } from '../../shared/file/types'
import { LOCAL_REMOVED_PREFIX, REMOTE_PENDING_PREFIX } from '../../shared/file/sync'

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

export function importGroupBundle(
  db: Database,
  inputPath: string,
  password: string,
  conflictMode: BundleConflictMode
): GroupBundleImportResult {
  const wrapped = JSON.parse(readFileSync(inputPath, 'utf8')) as BundleFile
  if (wrapped.version !== BUNDLE_VERSION) throw new Error('不支持的备份版本')
  const key = deriveKey(password, Buffer.from(wrapped.kdfSalt, 'base64'))
  const plainBuf = openBytes(
    key,
    Buffer.from(wrapped.ciphertext, 'base64'),
    wrapped.nonce,
    wrapped.authTag
  )
  const plain = JSON.parse(plainBuf.toString('utf8')) as BundlePlain
  const result: GroupBundleImportResult = {
    messagesImported: 0,
    tasksImported: 0,
    filesImported: 0,
    skipped: 0
  }

  const idMap = new Map<string, string>()

  for (const task of plain.tasks) {
    if (task.deletedAt) continue
    let taskId = task.taskId
    const exists = db.prepare(`SELECT 1 FROM tasks WHERE task_id = ?`).get(taskId)
    if (exists) {
      if (conflictMode === 'skip') {
        result.skipped += 1
        continue
      }
      if (conflictMode === 'new_id') {
        taskId = `task_${createHash('sha256').update(taskId + wrapped.exportedAt).digest('hex').slice(0, 12)}`
        idMap.set(task.taskId, taskId)
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
      }
    }
    insertMessage(db, { ...msg, msgId, groupId: msg.groupId || plain.groupId })
    result.messagesImported += 1
  }

  const filesRoot = join(app.getPath('userData'), 'files', plain.groupId)
  mkdirSync(filesRoot, { recursive: true })

  for (const file of plain.files) {
    const exists = db.prepare(`SELECT 1 FROM files WHERE file_id = ?`).get(file.fileId)
    if (exists && conflictMode === 'skip') {
      result.skipped += 1
      continue
    }
    let fileId = file.fileId
    if (exists && conflictMode === 'new_id') {
      fileId = `file_${randomBytes(8).toString('hex')}`
    }
    let storagePath = file.storagePath
    const bodyB64 = plain.fileBodies?.[file.fileId]
    if (bodyB64) {
      storagePath = join(filesRoot, `${fileId}${file.ext ? `.${file.ext.replace(/^\./, '')}` : ''}`)
      writeFileSync(storagePath, Buffer.from(bodyB64, 'base64'))
    }
    insertFile(db, { ...file, fileId, groupId: file.groupId || plain.groupId, storagePath })
    result.filesImported += 1
  }

  return result
}
