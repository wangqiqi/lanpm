/**
 * Seed demo-project for list-scroll measure: messages, tasks (board+gantt), files, nav tabs.
 * Env: LANPM_MEASURE_USER_DATA (existing lanpm.db from a prior app launch).
 */
import { existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID, createHash } from 'node:crypto'
import Database from 'better-sqlite3'
import {
  LIST_SCROLL_GROUP_ID,
  LIST_SCROLL_NAV_FILE,
  LIST_SCROLL_SURFACES,
  listScrollNavPreferencesDocument,
  listScrollSurfaceByView
} from '../../src/shared/perf/listScrollMeasure.ts'

const userData = process.env.LANPM_MEASURE_USER_DATA
if (!userData) {
  console.error('LANPM_MEASURE_USER_DATA required')
  process.exit(1)
}
const dbPath = join(userData, 'lanpm.db')
if (!existsSync(dbPath)) {
  console.error(`missing ${dbPath}`)
  process.exit(1)
}

const groupId = LIST_SCROLL_GROUP_ID
const chatMin = listScrollSurfaceByView('chat').minCount
const taskMin = listScrollSurfaceByView('board').minCount
const fileMin = listScrollSurfaceByView('files').minCount

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')

function ymdOffset(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const msgCount = db.prepare(`SELECT COUNT(*) AS c FROM messages WHERE group_id = ?`).get(groupId) as {
  c: number
}
const needMsg = Math.max(0, chatMin - (msgCount?.c ?? 0))
const now = new Date().toISOString()
const insertMsg = db.prepare(
  `INSERT INTO messages (
    msg_id, group_id, sender_user_id, sender_device_id, type, content_json,
    lamport_ts, created_at, delivery_status
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
)
const maxTs = db
  .prepare(`SELECT COALESCE(MAX(lamport_ts), 0) AS m FROM messages WHERE group_id = ?`)
  .get(groupId) as { m: number }
let ts = maxTs.m
for (let i = 0; i < needMsg; i++) {
  ts += 1
  insertMsg.run(
    `list_seed_msg_${randomUUID()}`,
    groupId,
    'user_perf',
    'dev_perf',
    'text',
    JSON.stringify({ kind: 'text', text: `list-scroll seed ${i}` }),
    ts,
    now,
    'sent'
  )
}

const taskCount = db
  .prepare(`SELECT COUNT(*) AS c FROM tasks WHERE group_id = ? AND deleted_at IS NULL`)
  .get(groupId) as { c: number }
const needTask = Math.max(0, taskMin - (taskCount?.c ?? 0))
const insertTask = db.prepare(
  `INSERT INTO tasks (
    task_id, group_id, parent_task_id, title, description,
    status, other_reason, priority, assignee_user_id, tags_json,
    source_msg_id, linked_file_ids_json,
    progress_percent, story_points, start_date, end_date, milestone, sort_order,
    created_by, created_at, updated_at, deleted_at, last_writer_device_id
  ) VALUES (
    ?, ?, NULL, ?, NULL,
    ?, NULL, 'medium', NULL, '[]',
    NULL, '[]',
    0, NULL, ?, ?, 0, ?,
    'user_perf', ?, ?, NULL, ''
  )`
)
const maxSort = db
  .prepare(`SELECT COALESCE(MAX(sort_order), 0) AS m FROM tasks WHERE group_id = ?`)
  .get(groupId) as { m: number }
let sort = maxSort.m
const statuses = ['todo', 'todo', 'todo', 'doing', 'done'] as const
for (let i = 0; i < needTask; i++) {
  sort += 1
  const start = ymdOffset(i % 14)
  const end = ymdOffset((i % 14) + 3)
  insertTask.run(
    `list_seed_task_${randomUUID()}`,
    groupId,
    `list-scroll task ${i}`,
    statuses[i % statuses.length],
    start,
    end,
    sort,
    now,
    now
  )
}

const fileCount = db.prepare(`SELECT COUNT(*) AS c FROM files WHERE group_id = ?`).get(groupId) as {
  c: number
}
const needFile = Math.max(0, fileMin - (fileCount?.c ?? 0))
const insertFile = db.prepare(
  `INSERT INTO files (
    file_id, group_id, name, ext, category, size, mime_type,
    uploaded_by, uploaded_at, sha256, storage_path,
    preview_status, preview_path, is_bookmark, bookmark_url, bookmark_title,
    updated_at
  ) VALUES (
    ?, ?, ?, 'txt', 'other', ?, 'text/plain',
    'user_perf', ?, ?, ?,
    'none', NULL, 0, NULL, NULL,
    ?
  )`
)
for (let i = 0; i < needFile; i++) {
  const name = `list-scroll-${i}.txt`
  const payload = Buffer.from(`seed ${i}\n`)
  insertFile.run(
    `list_seed_file_${randomUUID()}`,
    groupId,
    name,
    payload.length,
    now,
    createHash('sha256').update(payload).digest('hex'),
    join(userData, 'list-scroll-virtual', name),
    now
  )
}

writeFileSync(
  join(userData, LIST_SCROLL_NAV_FILE),
  `${JSON.stringify(listScrollNavPreferencesDocument(), null, 2)}\n`,
  'utf8'
)

db.close()
console.log(
  `measure-seed-lists: ${groupId} messages+${needMsg} tasks+${needTask} files+${needFile}; nav unhide files/gantt; surfaces=${LIST_SCROLL_SURFACES.map((s) => s.view).join(',')}`
)
