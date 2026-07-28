/**
 * Profile 迁移后 storage_path 回退解析
 * Run: npm run verify:storage-path-resolver
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import Database from 'better-sqlite3'
import assert from 'node:assert/strict'
import { mkLanpmTemp, rmLanpmTemp } from '../lanpmTemp.ts'

const dir = mkLanpmTemp('lanpm-storage-path-')
process.env.LANPM_USER_DATA = dir

const { repairFileStoragePaths, resolveFileDiskPath } = await import(
  '../../src/main/file/storagePathResolver.ts'
)
const { getFileById } = await import('../../src/main/storage/repositories/fileRepository.ts')

const groupId = 'demo-project'
const fileId = 'file_test_txt'
const name = 'sample.txt'
const canonical = join(dir, 'files', groupId, `${fileId}_${name}`)
mkdirSync(join(dir, 'files', groupId), { recursive: true })
writeFileSync(canonical, 'hello preview', 'utf8')

const stalePath = join(dir, 'stale', `${fileId}_${name}`)
const dbPath = join(dir, 'lanpm.db')
const db = new Database(dbPath)
db.exec(`
  CREATE TABLE files (
    file_id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    name TEXT NOT NULL,
    ext TEXT NOT NULL,
    category TEXT NOT NULL,
    size INTEGER NOT NULL,
    mime_type TEXT,
    uploaded_by TEXT NOT NULL,
    uploaded_at TEXT NOT NULL,
    sha256 TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    preview_status TEXT NOT NULL,
    preview_path TEXT,
    is_bookmark INTEGER NOT NULL DEFAULT 0,
    bookmark_url TEXT,
    bookmark_title TEXT,
    updated_at TEXT NOT NULL
  );
`)
db.prepare(
  `INSERT INTO files (
    file_id, group_id, name, ext, category, size, uploaded_by, uploaded_at,
    sha256, storage_path, preview_status, preview_path, is_bookmark, updated_at
  ) VALUES (?, ?, ?, 'txt', 'document', 13, 'u', datetime('now'), 'x', ?, 'ready', ?, 0, datetime('now'))`
).run(fileId, groupId, name, stalePath, stalePath)

const before = getFileById(db, fileId)!
assert.equal(existsSync(before.storagePath), false)
assert.equal(resolveFileDiskPath(before), canonical)
assert.equal(readFileSync(resolveFileDiskPath(before)!, 'utf8'), 'hello preview')

const fixed = repairFileStoragePaths(db)
assert.equal(fixed, 1)
const after = getFileById(db, fileId)!
assert.equal(after.storagePath, canonical)
assert.equal(after.previewPath, canonical)

db.close()
rmLanpmTemp(dir)
console.log('verify:storage-path-resolver OK')
