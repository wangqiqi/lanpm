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
  },
  {
    fromVersion: 5,
    description: 'group_tag_meta: per-group tag color dictionary (TASK-190)',
    up: (db) => {
      db.exec(`
        CREATE TABLE group_tag_meta (
          group_id TEXT NOT NULL,
          tag_key TEXT NOT NULL,
          label TEXT,
          color TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          updated_by_user_id TEXT,
          PRIMARY KEY (group_id, tag_key)
        )
      `)
    }
  },
  {
    fromVersion: 6,
    description: 'whiteboard_scenes: per-group Excalidraw scene (TASK-226)',
    up: (db) => {
      db.exec(`
        CREATE TABLE whiteboard_scenes (
          group_id TEXT PRIMARY KEY,
          scene_json TEXT NOT NULL,
          linked_task_id TEXT,
          updated_at TEXT NOT NULL
        )
      `)
    }
  },
  {
    fromVersion: 7,
    description: 'tasks.source_msg_id + linked_file_ids_json for A2 message↔task (TASK-230)',
    up: (db) => {
      db.exec(`ALTER TABLE tasks ADD COLUMN source_msg_id TEXT`)
      db.exec(`ALTER TABLE tasks ADD COLUMN linked_file_ids_json TEXT NOT NULL DEFAULT '[]'`)
    }
  },
  {
    fromVersion: 8,
    description: 'task_checklists + task_checklist_items for P1-3 (TASK-235)',
    up: (db) => {
      db.exec(`
        CREATE TABLE task_checklists (
          checklist_id TEXT PRIMARY KEY,
          task_id TEXT NOT NULL UNIQUE,
          group_id TEXT NOT NULL,
          title TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)
      db.exec(`
        CREATE TABLE task_checklist_items (
          item_id TEXT PRIMARY KEY,
          checklist_id TEXT NOT NULL,
          task_id TEXT NOT NULL,
          text TEXT NOT NULL,
          done INTEGER NOT NULL DEFAULT 0,
          sort_order INTEGER NOT NULL DEFAULT 0,
          linked_subtask_id TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT
        )
      `)
      db.exec(`CREATE INDEX idx_checklist_items_task ON task_checklist_items(task_id)`)
      db.exec(
        `CREATE INDEX idx_checklist_items_checklist ON task_checklist_items(checklist_id)`
      )
    }
  },
  {
    fromVersion: 9,
    description: 'whiteboard_crdt_docs: per-group Yjs snapshot blob (TASK-259)',
    up: (db) => {
      db.exec(`
        CREATE TABLE whiteboard_crdt_docs (
          group_id TEXT PRIMARY KEY,
          doc_id TEXT NOT NULL,
          update_blob BLOB NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)
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
