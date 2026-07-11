import type Database from 'better-sqlite3'
import { SCHEMA_SQL, SCHEMA_VERSION } from './schema.ts'

/**
 * One step: apply DDL/DML that advances user_version from `fromVersion` to `fromVersion + 1`.
 * Keep steps pure SQL / better-sqlite3 calls; no Electron APIs.
 */
export interface MigrationStep {
  /** Current user_version before this step runs (0-based after bootstrap is separate). */
  fromVersion: number
  description: string
  up: (db: Database.Database) => void
}

/**
 * Incremental steps for versions ≥ 1.
 * v0 bootstrap uses full SCHEMA_SQL at SCHEMA_VERSION.
 * Adding vN: push `{ fromVersion: N-1, … }` and bump SCHEMA_VERSION.
 */
export const MIGRATIONS: readonly MigrationStep[] = [
  {
    fromVersion: 1,
    description: 'task_dependencies updated_at + deleted_at for task_dep_patch LWW',
    up: (db) => {
      db.exec(`ALTER TABLE task_dependencies ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''`)
      db.exec(`ALTER TABLE task_dependencies ADD COLUMN deleted_at TEXT`)
      db.exec(
        `UPDATE task_dependencies SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE updated_at = ''`
      )
    }
  },
  {
    fromVersion: 2,
    description: 'LWW tie-break: last_writer_device_id on tasks and task_dependencies',
    up: (db) => {
      db.exec(`ALTER TABLE tasks ADD COLUMN last_writer_device_id TEXT NOT NULL DEFAULT ''`)
      db.exec(
        `ALTER TABLE task_dependencies ADD COLUMN last_writer_device_id TEXT NOT NULL DEFAULT ''`
      )
    }
  },
  {
    fromVersion: 3,
    description: 'task_crdt_docs: per-group Yjs snapshot blob (TASK-158)',
    up: (db) => {
      db.exec(`
        CREATE TABLE task_crdt_docs (
          group_id TEXT PRIMARY KEY,
          doc_id TEXT NOT NULL,
          update_blob BLOB NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)
    }
  },
  {
    fromVersion: 4,
    description: 'tasks.tags_json for independent board tags (TASK-172)',
    up: (db) => {
      db.exec(`ALTER TABLE tasks ADD COLUMN tags_json TEXT NOT NULL DEFAULT '[]'`)
    }
  }
]

function setUserVersion(db: Database.Database, version: number): void {
  db.pragma(`user_version = ${version}`)
}

function getUserVersion(db: Database.Database): number {
  return db.pragma('user_version', { simple: true }) as number
}

/**
 * Bring DB to SCHEMA_VERSION.
 * - 0 → exec full SCHEMA_SQL, set version
 * - 1..SCHEMA_VERSION-1 → run MIGRATIONS in order
 * - SCHEMA_VERSION → no-op
 * - > SCHEMA_VERSION → throw
 */
export function applyMigrations(db: Database.Database): void {
  let version = getUserVersion(db)

  if (version > SCHEMA_VERSION) {
    throw new Error(
      `SQLite user_version=${version} is newer than app SCHEMA_VERSION=${SCHEMA_VERSION}. ` +
        `Upgrade the app or restore a compatible lanpm.db backup.`
    )
  }

  if (version === 0) {
    const bootstrap = db.transaction(() => {
      db.exec(SCHEMA_SQL)
      setUserVersion(db, SCHEMA_VERSION)
    })
    bootstrap()
    return
  }

  if (version === SCHEMA_VERSION) {
    return
  }

  const byFrom = new Map(MIGRATIONS.map((m) => [m.fromVersion, m]))
  while (version < SCHEMA_VERSION) {
    const step = byFrom.get(version)
    if (!step) {
      throw new Error(
        `Missing migration step from user_version=${version} to ${version + 1} ` +
          `(SCHEMA_VERSION=${SCHEMA_VERSION}). Add MIGRATIONS entry or restore backup.`
      )
    }
    const next = version + 1
    const run = db.transaction(() => {
      step.up(db)
      setUserVersion(db, next)
    })
    run()
    version = getUserVersion(db)
    if (version !== next) {
      throw new Error(
        `Migration "${step.description}" did not advance user_version to ${next} (got ${version})`
      )
    }
  }
}
