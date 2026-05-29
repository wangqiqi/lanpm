import type { Database } from 'better-sqlite3'

/** DATA-SCHEMA-FK — 应用层维护引用完整性（SQLite 未启用 ON DELETE CASCADE） */

export function pruneOrphanTaskDependencies(db: Database): number {
  const result = db
    .prepare(
      `DELETE FROM task_dependencies
       WHERE from_task_id NOT IN (SELECT task_id FROM tasks WHERE deleted_at IS NULL)
          OR to_task_id NOT IN (SELECT task_id FROM tasks WHERE deleted_at IS NULL)`
    )
    .run()
  return result.changes
}

export function pruneOrphanFileTransfers(db: Database): number {
  const result = db
    .prepare(
      `DELETE FROM file_transfers
       WHERE file_id NOT IN (SELECT file_id FROM files)`
    )
    .run()
  return result.changes
}

export function runReferentialCleanup(db: Database): {
  taskDeps: number
  fileTransfers: number
} {
  return {
    taskDeps: pruneOrphanTaskDependencies(db),
    fileTransfers: pruneOrphanFileTransfers(db)
  }
}
