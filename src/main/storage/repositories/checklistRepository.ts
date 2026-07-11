import { randomUUID } from 'crypto'
import type Database from 'better-sqlite3'
import type {
  ChecklistItem,
  TaskChecklist,
  UpsertChecklistItemInput
} from '../../../shared/task/checklist.ts'
import { checklistProgressOf } from '../../../shared/task/checklist.ts'

interface ChecklistRow {
  checklist_id: string
  task_id: string
  group_id: string
  title: string
  created_at: string
  updated_at: string
}

interface ItemRow {
  item_id: string
  checklist_id: string
  task_id: string
  text: string
  done: number
  sort_order: number
  linked_subtask_id: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

function rowToChecklist(row: ChecklistRow): TaskChecklist {
  return {
    checklistId: row.checklist_id,
    taskId: row.task_id,
    groupId: row.group_id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function rowToItem(row: ItemRow): ChecklistItem {
  return {
    itemId: row.item_id,
    checklistId: row.checklist_id,
    taskId: row.task_id,
    text: row.text,
    done: row.done === 1,
    sortOrder: row.sort_order,
    linkedSubtaskId: row.linked_subtask_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function getChecklistByTaskId(db: Database.Database, taskId: string): TaskChecklist | null {
  const row = db
    .prepare(`SELECT * FROM task_checklists WHERE task_id = ?`)
    .get(taskId) as ChecklistRow | undefined
  return row ? rowToChecklist(row) : null
}

export function ensureChecklistForTask(
  db: Database.Database,
  groupId: string,
  taskId: string
): TaskChecklist {
  const existing = getChecklistByTaskId(db, taskId)
  if (existing) return existing
  const now = new Date().toISOString()
  const checklistId = `cl_${randomUUID()}`
  db.prepare(
    `INSERT INTO task_checklists (checklist_id, task_id, group_id, title, created_at, updated_at)
     VALUES (?, ?, ?, '', ?, ?)`
  ).run(checklistId, taskId, groupId, now, now)
  return {
    checklistId,
    taskId,
    groupId,
    title: '',
    createdAt: now,
    updatedAt: now
  }
}

export function listChecklistItemsByTaskId(
  db: Database.Database,
  taskId: string
): ChecklistItem[] {
  const rows = db
    .prepare(
      `SELECT * FROM task_checklist_items
       WHERE task_id = ? AND deleted_at IS NULL
       ORDER BY sort_order ASC, created_at ASC`
    )
    .all(taskId) as ItemRow[]
  return rows.map(rowToItem)
}

export function getChecklistItemById(
  db: Database.Database,
  itemId: string
): ChecklistItem | null {
  const row = db
    .prepare(`SELECT * FROM task_checklist_items WHERE item_id = ? AND deleted_at IS NULL`)
    .get(itemId) as ItemRow | undefined
  return row ? rowToItem(row) : null
}

export function upsertChecklistItemRow(
  db: Database.Database,
  input: UpsertChecklistItemInput
): ChecklistItem {
  const checklist = ensureChecklistForTask(db, input.groupId, input.taskId)
  const now = new Date().toISOString()
  const text = input.text.trim()
  if (!text) throw new Error('checklist item text required')

  if (input.itemId) {
    const existing = getChecklistItemById(db, input.itemId)
    if (!existing || existing.taskId !== input.taskId) {
      throw new Error('checklist item not found')
    }
    const done =
      input.done !== undefined ? (input.done ? 1 : 0) : existing.done ? 1 : 0
    const sortOrder = input.sortOrder ?? existing.sortOrder
    const linked =
      input.linkedSubtaskId === undefined
        ? (existing.linkedSubtaskId ?? null)
        : input.linkedSubtaskId
    db.prepare(
      `UPDATE task_checklist_items
       SET text = ?, done = ?, sort_order = ?, linked_subtask_id = ?, updated_at = ?
       WHERE item_id = ? AND deleted_at IS NULL`
    ).run(text, done, sortOrder, linked, now, input.itemId)
    return getChecklistItemById(db, input.itemId)!
  }

  const maxSort = db
    .prepare(
      `SELECT COALESCE(MAX(sort_order), -1) AS m FROM task_checklist_items
       WHERE task_id = ? AND deleted_at IS NULL`
    )
    .get(input.taskId) as { m: number }
  const sortOrder = input.sortOrder ?? maxSort.m + 1
  const itemId = `cli_${randomUUID()}`
  db.prepare(
    `INSERT INTO task_checklist_items (
       item_id, checklist_id, task_id, text, done, sort_order,
       linked_subtask_id, created_at, updated_at, deleted_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`
  ).run(
    itemId,
    checklist.checklistId,
    input.taskId,
    text,
    input.done ? 1 : 0,
    sortOrder,
    input.linkedSubtaskId ?? null,
    now,
    now
  )
  db.prepare(`UPDATE task_checklists SET updated_at = ? WHERE checklist_id = ?`).run(
    now,
    checklist.checklistId
  )
  return getChecklistItemById(db, itemId)!
}

export function setChecklistItemDone(
  db: Database.Database,
  itemId: string,
  done: boolean
): ChecklistItem | null {
  const existing = getChecklistItemById(db, itemId)
  if (!existing) return null
  const now = new Date().toISOString()
  db.prepare(
    `UPDATE task_checklist_items SET done = ?, updated_at = ? WHERE item_id = ? AND deleted_at IS NULL`
  ).run(done ? 1 : 0, now, itemId)
  return getChecklistItemById(db, itemId)
}

export function softDeleteChecklistItem(db: Database.Database, itemId: string): boolean {
  const existing = getChecklistItemById(db, itemId)
  if (!existing) return false
  const now = new Date().toISOString()
  const r = db
    .prepare(
      `UPDATE task_checklist_items SET deleted_at = ?, updated_at = ?
       WHERE item_id = ? AND deleted_at IS NULL`
    )
    .run(now, now, itemId)
  return r.changes > 0
}

export function deleteChecklistsForGroup(db: Database.Database, groupId: string): void {
  db.prepare(
    `DELETE FROM task_checklist_items
     WHERE task_id IN (SELECT task_id FROM tasks WHERE group_id = ?)
        OR checklist_id IN (SELECT checklist_id FROM task_checklists WHERE group_id = ?)`
  ).run(groupId, groupId)
  db.prepare(`DELETE FROM task_checklists WHERE group_id = ?`).run(groupId)
}

/** Group export helper — checklist + active items (TASK-311). */
export function listChecklistsByGroup(
  db: Database.Database,
  groupId: string
): Array<{ checklist: TaskChecklist; items: ChecklistItem[] }> {
  const rows = db
    .prepare(
      `SELECT * FROM task_checklists WHERE group_id = ? ORDER BY created_at ASC`
    )
    .all(groupId) as ChecklistRow[]
  return rows.map((row) => {
    const checklist = rowToChecklist(row)
    return {
      checklist,
      items: listChecklistItemsByTaskId(db, checklist.taskId)
    }
  })
}

export function progressForTask(db: Database.Database, taskId: string) {
  return checklistProgressOf(listChecklistItemsByTaskId(db, taskId))
}
