import type { Database } from 'better-sqlite3'
import { assertPaidPluginLicensed } from '../plugin/licenseStore.ts'
import { listTasksByGroup } from '../storage/repositories/taskRepository.ts'
import {
  listAgileBurndownSamples,
  upsertAgileBurndownSample
} from '../storage/repositories/agileBurndownRepository.ts'
import {
  buildAgileBurndownView,
  localYmd,
  remainingStoryPoints,
  type AgileBurndownView
} from '../../shared/task/agileBurndown.ts'

function requirePaidAgile(): void {
  assertPaidPluginLicensed('lanpm.agile', 'paid')
}

export function getAgileBurndown(
  db: Database,
  groupId: string,
  now = new Date()
): AgileBurndownView {
  requirePaidAgile()
  if (typeof groupId !== 'string' || !groupId.trim()) {
    throw new Error('groupId required')
  }
  const gid = groupId.trim()
  const tasks = listTasksByGroup(db, gid)
  const today = localYmd(now)
  upsertAgileBurndownSample(db, gid, today, remainingStoryPoints(tasks), now.toISOString())
  return buildAgileBurndownView({
    groupId: gid,
    tasks,
    today,
    samples: listAgileBurndownSamples(db, gid)
  })
}
