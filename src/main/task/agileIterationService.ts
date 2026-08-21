import { randomUUID } from 'node:crypto'
import type { Database } from 'better-sqlite3'
import { assertPaidPluginLicensed } from '../plugin/licenseStore.ts'
import {
  parseIterationDates,
  parseIterationName,
  tasksInCurrentIteration,
  type AgileIterationSnapshot
} from '../../shared/task/agileIteration.ts'
import {
  getAgileIteration,
  insertAgileIteration,
  listAgileIterationSamples,
  listAgileIterationSnapshot,
  setCurrentIterationId,
  upsertAgileIterationSample
} from '../storage/repositories/agileIterationRepository.ts'

function requirePaidAgile(): void {
  assertPaidPluginLicensed('lanpm.agile', 'paid')
}

function requireGroupId(groupId: string): string {
  if (typeof groupId !== 'string' || !groupId.trim()) {
    throw new Error('groupId required')
  }
  return groupId.trim()
}

export function getAgileIterations(db: Database, groupId: string): AgileIterationSnapshot {
  requirePaidAgile()
  return listAgileIterationSnapshot(db, requireGroupId(groupId))
}

export function createAgileIteration(
  db: Database,
  groupId: string,
  name: unknown,
  startDate: unknown,
  endDate: unknown
): AgileIterationSnapshot {
  requirePaidAgile()
  const gid = requireGroupId(groupId)
  const parsedName = parseIterationName(name)
  if (!parsedName) throw new Error('iteration name required')
  const dates = parseIterationDates(startDate, endDate)
  if (!dates) throw new Error('iteration dates must be YYYY-MM-DD and start <= end')
  const now = new Date().toISOString()
  const iterationId = `it_${randomUUID()}`
  insertAgileIteration(db, {
    iterationId,
    groupId: gid,
    name: parsedName,
    startDate: dates.startDate,
    endDate: dates.endDate,
    createdAt: now,
    updatedAt: now
  })
  setCurrentIterationId(db, gid, iterationId)
  return listAgileIterationSnapshot(db, gid)
}

export function setCurrentAgileIteration(
  db: Database,
  groupId: string,
  iterationId: string | null
): AgileIterationSnapshot {
  requirePaidAgile()
  const gid = requireGroupId(groupId)
  if (iterationId) {
    const row = getAgileIteration(db, iterationId)
    if (!row || row.groupId !== gid) throw new Error('iteration not in group')
    setCurrentIterationId(db, gid, iterationId)
  } else {
    setCurrentIterationId(db, gid, null)
  }
  return listAgileIterationSnapshot(db, gid)
}

export function assertTaskIterationInGroup(
  db: Database,
  groupId: string,
  iterationId: string | null | undefined
): void {
  if (iterationId === undefined || iterationId === null || iterationId === '') return
  const row = getAgileIteration(db, iterationId)
  if (!row || row.groupId !== groupId) throw new Error('iteration not in group')
}

export { tasksInCurrentIteration, listAgileIterationSamples, upsertAgileIterationSample, getAgileIteration }
