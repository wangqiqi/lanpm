import { existsSync, readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const dir = dirname(fileURLToPath(import.meta.url))

function loadSchemaSql(): string {
  const candidates = [
    join(dir, 'schema.sql'),
    join(process.cwd(), 'src/main/storage/schema.sql')
  ]
  for (const path of candidates) {
    if (existsSync(path)) return readFileSync(path, 'utf8')
  }
  throw new Error('schema.sql not found (expected beside bundle or in src/main/storage)')
}

/** Load DDL from schema.sql (copied to out/main on build). */
export const SCHEMA_SQL = loadSchemaSql()

/** Expected tables after schema v1 (for startup verification). */
export const EXPECTED_TABLES = [
  'users',
  'devices',
  'groups',
  'group_members',
  'group_join_requests',
  'messages',
  'read_receipts',
  'tasks',
  'task_dependencies',
  'files',
  'file_transfers',
  'ai_config',
  'sync_meta',
  'sync_outbox',
  'task_crdt_docs',
  'group_tag_meta',
  'whiteboard_scenes',
  'whiteboard_crdt_docs',
  'task_checklists',
  'task_checklist_items',
  'mindmap_documents',
  'mindmap_crdt_docs',
  'ai_threads',
  'ai_messages',
  'ai_patrol_runs',
  'ai_pipeline_runs'
] as const

export const SCHEMA_VERSION = 19
