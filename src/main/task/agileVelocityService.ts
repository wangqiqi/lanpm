import type { Database } from 'better-sqlite3'
import { assertPaidPluginLicensed } from '../plugin/licenseStore.ts'
import { listTasksByGroup } from '../storage/repositories/taskRepository.ts'
import { listAgileIterations } from '../storage/repositories/agileIterationRepository.ts'
import { buildAgileVelocityView, type AgileVelocityView } from '../../shared/task/agileVelocity.ts'

function requirePaidAgile(): void {
  assertPaidPluginLicensed('lanpm.agile', 'paid')
}

export function getAgileVelocity(db: Database, groupId: string): AgileVelocityView {
  requirePaidAgile()
  if (typeof groupId !== 'string' || !groupId.trim()) {
    throw new Error('groupId required')
  }
  const gid = groupId.trim()
  const iterations = listAgileIterations(db, gid)
  const tasks = listTasksByGroup(db, gid)
  return buildAgileVelocityView(gid, iterations, tasks)
}
