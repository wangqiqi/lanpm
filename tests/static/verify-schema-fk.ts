/**
 * DATA-SCHEMA-FK — 引用完整性由应用层维护（非 ON DELETE CASCADE）
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { projectRoot } from '../projectRoot.ts'

const root = projectRoot

const cleanup = readFileSync(join(root, 'src/main/storage/referentialCleanup.ts'), 'utf8')
assert.match(cleanup, /pruneOrphanTaskDependencies/, 'task_dependencies cleanup required')
assert.match(cleanup, /pruneOrphanFileTransfers/, 'file_transfers cleanup required')

const retention = readFileSync(join(root, 'src/main/data/messageRetentionService.ts'), 'utf8')
assert.match(retention, /runReferentialCleanup/, 'retention scheduler must run referential cleanup')

const schema = readFileSync(join(root, 'src/main/storage/schema.sql'), 'utf8')
assert.ok(!/ON DELETE CASCADE/i.test(schema), 'schema should not rely on CASCADE (app-layer policy)')

console.log('verify:schema-fk OK')
