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
  },
  {
    fromVersion: 10,
    description: 'sync_outbox: durable publish retry queue (TASK-300 / B4)',
    up: (db) => {
      db.exec(`
        CREATE TABLE sync_outbox (
          id TEXT PRIMARY KEY,
          channel TEXT NOT NULL,
          group_id TEXT NOT NULL,
          dedupe_key TEXT NOT NULL,
          envelope_json TEXT NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0,
          next_attempt_at TEXT NOT NULL,
          last_error TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE (channel, dedupe_key)
        )
      `)
      db.exec(`CREATE INDEX idx_sync_outbox_due ON sync_outbox(next_attempt_at)`)
    }
  },
  {
    fromVersion: 11,
    description: 'ai_threads + ai_messages: local AI assistant sessions (SPRINT-AI-01)',
    up: (db) => {
      db.exec(`
        CREATE TABLE ai_threads (
          thread_id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          group_id TEXT,
          title TEXT NOT NULL DEFAULT '',
          context_json TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)
      db.exec(`CREATE INDEX idx_ai_threads_user ON ai_threads(user_id, updated_at DESC)`)
      db.exec(`CREATE INDEX idx_ai_threads_user_group ON ai_threads(user_id, group_id)`)
      db.exec(`
        CREATE TABLE ai_messages (
          message_id TEXT PRIMARY KEY,
          thread_id TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
          content TEXT NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY (thread_id) REFERENCES ai_threads(thread_id)
        )
      `)
      db.exec(`CREATE INDEX idx_ai_messages_thread ON ai_messages(thread_id, created_at)`)
    }
  },
  {
    fromVersion: 12,
    description: 'ai_config patrol columns + ai_patrol_runs (SPRINT-AI-03)',
    up: (db) => {
      db.exec(`ALTER TABLE ai_config ADD COLUMN patrol_enabled INTEGER NOT NULL DEFAULT 1`)
      db.exec(
        `ALTER TABLE ai_config ADD COLUMN patrol_interval_hours INTEGER NOT NULL DEFAULT 24`
      )
      db.exec(`
        CREATE TABLE ai_patrol_runs (
          run_id TEXT PRIMARY KEY,
          started_at TEXT NOT NULL,
          finished_at TEXT NOT NULL,
          finding_count INTEGER NOT NULL DEFAULT 0,
          summary TEXT NOT NULL,
          used_external_ai INTEGER NOT NULL DEFAULT 0,
          findings_json TEXT NOT NULL DEFAULT '[]'
        )
      `)
      db.exec(`CREATE INDEX idx_ai_patrol_runs_started ON ai_patrol_runs(started_at DESC)`)
    }
  },
  {
    fromVersion: 13,
    description: 'ai_pipeline_runs (SPRINT-AI-06)',
    up: (db) => {
      db.exec(`
        CREATE TABLE ai_pipeline_runs (
          run_id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          group_id TEXT NOT NULL,
          preset_id TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
          started_at TEXT NOT NULL,
          finished_at TEXT,
          steps_json TEXT NOT NULL DEFAULT '[]',
          final_markdown TEXT,
          used_external_ai INTEGER NOT NULL DEFAULT 0,
          degraded INTEGER NOT NULL DEFAULT 0
        )
      `)
      db.exec(
        `CREATE INDEX idx_ai_pipeline_runs_user_started ON ai_pipeline_runs(user_id, started_at DESC)`
      )
    }
  },
  {
    fromVersion: 14,
    description: 'ai_config scoped per local user_id (no shared singleton)',
    up: (db) => {
      const hasLegacy = db
        .prepare(
          `SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'ai_config'`
        )
        .get() as { sql: string } | undefined
      if (!hasLegacy?.sql?.includes('user_id')) {
        db.exec(`
          CREATE TABLE ai_config_user (
            user_id TEXT PRIMARY KEY,
            provider TEXT NOT NULL,
            api_key_enc TEXT NOT NULL,
            base_url TEXT NOT NULL,
            model TEXT NOT NULL,
            enabled INTEGER NOT NULL DEFAULT 0,
            data_policy TEXT NOT NULL DEFAULT 'desensitized-only',
            patrol_enabled INTEGER NOT NULL DEFAULT 1,
            patrol_interval_hours INTEGER NOT NULL DEFAULT 24
          )
        `)
        const legacy = db.prepare(`SELECT * FROM ai_config WHERE id = 1`).get() as
          | {
              provider: string
              api_key_enc: string
              base_url: string
              model: string
              enabled: number
              data_policy: string
              patrol_enabled: number
              patrol_interval_hours: number
            }
          | undefined
        if (legacy?.api_key_enc) {
          let userId: string | null = null
          const deviceRow = db
            .prepare(`SELECT value FROM sync_meta WHERE key = ?`)
            .get('local_device_id') as { value: string } | undefined
          if (deviceRow?.value) {
            const device = db
              .prepare(`SELECT user_id FROM devices WHERE device_id = ?`)
              .get(deviceRow.value) as { user_id: string } | undefined
            userId = device?.user_id ?? null
          }
          if (!userId) {
            const firstUser = db
              .prepare(`SELECT user_id FROM users ORDER BY created_at ASC LIMIT 1`)
              .get() as { user_id: string } | undefined
            userId = firstUser?.user_id ?? null
          }
          if (userId) {
            db.prepare(
              `INSERT INTO ai_config_user (
                user_id, provider, api_key_enc, base_url, model, enabled, data_policy,
                patrol_enabled, patrol_interval_hours
              ) VALUES (
                @userId, @provider, @apiKeyEnc, @baseUrl, @model, @enabled, @dataPolicy,
                @patrolEnabled, @patrolIntervalHours
              )`
            ).run({
              userId,
              provider: legacy.provider,
              apiKeyEnc: legacy.api_key_enc,
              baseUrl: legacy.base_url,
              model: legacy.model,
              enabled: legacy.enabled,
              dataPolicy: legacy.data_policy,
              patrolEnabled: legacy.patrol_enabled,
              patrolIntervalHours: legacy.patrol_interval_hours
            })
          }
        }
        db.exec(`DROP TABLE ai_config`)
        db.exec(`ALTER TABLE ai_config_user RENAME TO ai_config`)
      }
    }
  },
  {
    fromVersion: 15,
    description: 'group_join_requests for discover join approval (TASK-PAIR-10)',
    up: (db) => {
      db.exec(`
        CREATE TABLE group_join_requests (
          request_id TEXT PRIMARY KEY,
          group_id TEXT NOT NULL,
          applicant_user_id TEXT NOT NULL,
          applicant_display_name TEXT NOT NULL,
          owner_user_id TEXT NOT NULL,
          status TEXT NOT NULL,
          created_at TEXT NOT NULL,
          decided_at TEXT,
          decided_by TEXT
        )
      `)
      db.exec(
        `CREATE INDEX idx_group_join_requests_owner ON group_join_requests(owner_user_id, status)`
      )
      db.exec(
        `CREATE INDEX idx_group_join_requests_applicant ON group_join_requests(applicant_user_id, group_id, status)`
      )
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
