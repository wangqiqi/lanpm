/**
 * TASK-6903 — agile_wip_limits SQLite round-trip (Electron ABI).
 */
import assert from 'node:assert/strict'
import Database from 'better-sqlite3'
import { applyMigrations } from '../../src/main/storage/migrate.ts'
import {
  listAgileWipLimits,
  upsertAgileWipLimit
} from '../../src/main/storage/repositories/agileWipRepository.ts'

const db = new Database(':memory:')
applyMigrations(db)
upsertAgileWipLimit(db, 'g1', 'doing', 3)
upsertAgileWipLimit(db, 'g1', 'doing', 2)
upsertAgileWipLimit(db, 'g1', 'todo', 0)
const limits = listAgileWipLimits(db, 'g1')
assert.equal(limits.doing, 2)
assert.equal(limits.todo, undefined)
db.close()
console.log('verify:agile-wip OK')
