import type { Database } from 'better-sqlite3'
import { assertPaidPluginLicensed } from '../plugin/licenseStore.ts'
import type { AgileWipSnapshot } from '../../shared/task/columnWip.ts'
import { isWipStatus } from '../../shared/task/columnWip.ts'
import { listAgileWipLimits, upsertAgileWipLimit } from '../storage/repositories/agileWipRepository.ts'

function requirePaidAgile(): void {
  assertPaidPluginLicensed('lanpm.agile', 'paid')
}

export function getAgileWipLimits(db: Database, groupId: string): AgileWipSnapshot {
  requirePaidAgile()
  if (typeof groupId !== 'string' || !groupId.trim()) {
    throw new Error('groupId required')
  }
  const gid = groupId.trim()
  return { groupId: gid, limits: listAgileWipLimits(db, gid) }
}

export function setAgileWipLimit(
  db: Database,
  groupId: string,
  status: string,
  limit: number | null
): AgileWipSnapshot {
  requirePaidAgile()
  if (typeof groupId !== 'string' || !groupId.trim()) {
    throw new Error('groupId required')
  }
  if (!isWipStatus(status)) {
    throw new Error('status must be todo, doing, done, or other')
  }
  const gid = groupId.trim()
  upsertAgileWipLimit(db, gid, status, limit)
  return { groupId: gid, limits: listAgileWipLimits(db, gid) }
}
