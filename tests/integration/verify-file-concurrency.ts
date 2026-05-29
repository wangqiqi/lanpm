/**
 * AUTO-14 — 文件传输并发上限：常量 + fileService 守卫 + countActiveTransfers 边界。
 * Run: npm run verify:file-concurrency
 */
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import { FILE_MAX_CONCURRENT } from '../../src/shared/file/channels.ts'
import { countActiveTransfers, insertTransfer } from '../../src/main/storage/repositories/fileTransferRepository.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const schemaSql = readFileSync(join(root, 'src/main/storage/schema.sql'), 'utf8')
const fileServiceSrc = readFileSync(join(root, 'src/main/file/fileService.ts'), 'utf8')

assert.equal(FILE_MAX_CONCURRENT, 3, 'FILE_MAX_CONCURRENT should be 3 per PRD')
assert.match(
  fileServiceSrc,
  /while\s*\(\s*countActiveTransfers\s*\(\s*db\s*\)\s*>=\s*FILE_MAX_CONCURRENT\s*\)/,
  'fileService must wait when active transfers >= FILE_MAX_CONCURRENT'
)

const dir = mkdtempSync(join(tmpdir(), 'lanpm-file-conc-'))
const db = new Database(join(dir, 'test.db'))
db.exec(schemaSql)

const GROUP = 'demo-project'
const now = new Date().toISOString()

function seedActive(index: number): void {
  insertTransfer(db, {
    transferId: `xfer_${index}_${randomUUID()}`,
    fileId: `file_${index}`,
    groupId: GROUP,
    direction: 'upload',
    fromDeviceId: 'dev_a',
    toDeviceId: 'dev_b',
    status: index % 2 === 0 ? 'queued' : 'transferring',
    totalBytes: 1024,
    transferredBytes: 0,
    chunkSize: 256 * 1024,
    checksum: 'sha256:deadbeef',
    startedAt: now
  })
}

try {
  for (let i = 0; i < FILE_MAX_CONCURRENT; i++) seedActive(i)
  assert.equal(countActiveTransfers(db), FILE_MAX_CONCURRENT)

  seedActive(FILE_MAX_CONCURRENT)
  assert.equal(
    countActiveTransfers(db),
    FILE_MAX_CONCURRENT + 1,
    'countActiveTransfers should include queued + transferring'
  )

  insertTransfer(db, {
    transferId: `done_${randomUUID()}`,
    fileId: 'file_done',
    groupId: GROUP,
    direction: 'download',
    fromDeviceId: 'dev_a',
    toDeviceId: 'dev_b',
    status: 'completed',
    totalBytes: 512,
    transferredBytes: 512,
    chunkSize: 256 * 1024,
    checksum: 'sha256:done',
    startedAt: now,
    finishedAt: now
  })
  assert.equal(
    countActiveTransfers(db),
    FILE_MAX_CONCURRENT + 1,
    'completed transfers must not count toward concurrency cap'
  )
} finally {
  db.close()
}

console.log(`verify:file-concurrency OK (limit=${FILE_MAX_CONCURRENT})`)
