import type { Database } from 'better-sqlite3'
import { listTasksByGroup } from '../storage/repositories/taskRepository.ts'
import { assertPaidPluginLicensed } from '../plugin/licenseStore.ts'
import { defaultScheduleForTask } from '../../shared/task/ganttAdapter.ts'
import type {
  FreezeScheduleBaselineResult,
  ScheduleBaselineSnapshot,
  ScheduleBaselineTask
} from '../../shared/task/scheduleBaseline.ts'
import {
  listGroupScheduleBaseline,
  replaceGroupScheduleBaseline
} from '../storage/repositories/scheduleBaselineRepository.ts'

function requirePaidSchedule(): void {
  assertPaidPluginLicensed('lanpm.schedule', 'paid')
}

export function freezeScheduleBaseline(
  db: Database,
  groupId: string
): FreezeScheduleBaselineResult {
  requirePaidSchedule()
  if (typeof groupId !== 'string' || !groupId.trim()) {
    throw new Error('groupId required')
  }
  const gid = groupId.trim()
  const frozenAt = new Date().toISOString()
  const tasks: ScheduleBaselineTask[] = listTasksByGroup(db, gid).map((task) => {
    const dates = defaultScheduleForTask(task)
    return { taskId: task.taskId, startDate: dates.startDate, endDate: dates.endDate }
  })
  replaceGroupScheduleBaseline(db, gid, frozenAt, tasks)
  return { groupId: gid, frozenAt, count: tasks.length }
}

export function getScheduleBaseline(db: Database, groupId: string): ScheduleBaselineSnapshot {
  requirePaidSchedule()
  if (typeof groupId !== 'string' || !groupId.trim()) {
    throw new Error('groupId required')
  }
  const gid = groupId.trim()
  const { frozenAt, tasks } = listGroupScheduleBaseline(db, gid)
  return { groupId: gid, frozenAt, tasks }
}
