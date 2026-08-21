import type { Database } from 'better-sqlite3'
import type { ScheduleBaselineTask } from '../../../shared/task/scheduleBaseline.ts'

interface BaselineRow {
  group_id: string
  task_id: string
  start_date: string
  end_date: string
  frozen_at: string
}

export function replaceGroupScheduleBaseline(
  db: Database,
  groupId: string,
  frozenAt: string,
  tasks: ScheduleBaselineTask[]
): void {
  const del = db.prepare(`DELETE FROM schedule_baselines WHERE group_id = ?`)
  const ins = db.prepare(
    `INSERT INTO schedule_baselines (group_id, task_id, start_date, end_date, frozen_at)
     VALUES (?, ?, ?, ?, ?)`
  )
  const tx = db.transaction(() => {
    del.run(groupId)
    for (const task of tasks) {
      ins.run(groupId, task.taskId, task.startDate, task.endDate, frozenAt)
    }
  })
  tx()
}

export function listGroupScheduleBaseline(
  db: Database,
  groupId: string
): { frozenAt: string | null; tasks: ScheduleBaselineTask[] } {
  const rows = db
    .prepare(
      `SELECT group_id, task_id, start_date, end_date, frozen_at
       FROM schedule_baselines WHERE group_id = ?`
    )
    .all(groupId) as BaselineRow[]
  if (rows.length === 0) return { frozenAt: null, tasks: [] }
  return {
    frozenAt: rows[0]!.frozen_at,
    tasks: rows.map((r) => ({
      taskId: r.task_id,
      startDate: r.start_date,
      endDate: r.end_date
    }))
  }
}
