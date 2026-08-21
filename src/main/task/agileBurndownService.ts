import type { Database } from 'better-sqlite3'
import { assertPaidPluginLicensed } from '../plugin/licenseStore.ts'
import { listTasksByGroup } from '../storage/repositories/taskRepository.ts'
import {
  listAgileBurndownSamples,
  upsertAgileBurndownSample
} from '../storage/repositories/agileBurndownRepository.ts'
import {
  getAgileIteration,
  listAgileIterationSamples,
  upsertAgileIterationSample
} from '../storage/repositories/agileIterationRepository.ts'
import { tasksInCurrentIteration } from '../../shared/task/agileIteration.ts'
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
  iterationId?: string | null,
  now = new Date()
): AgileBurndownView {
  requirePaidAgile()
  if (typeof groupId !== 'string' || !groupId.trim()) {
    throw new Error('groupId required')
  }
  const gid = groupId.trim()
  const all = listTasksByGroup(db, gid)
  const today = localYmd(now)
  const scopedId = iterationId && iterationId.trim() ? iterationId.trim() : null
  if (scopedId) {
    const iteration = getAgileIteration(db, scopedId)
    if (!iteration || iteration.groupId !== gid) throw new Error('iteration not in group')
    const tasks = tasksInCurrentIteration(all, scopedId)
    const remaining = remainingStoryPoints(tasks)
    upsertAgileIterationSample(db, scopedId, today, remaining, now.toISOString())
    return buildAgileBurndownView({
      groupId: gid,
      tasks,
      today,
      samples: listAgileIterationSamples(db, scopedId),
      window: { start: iteration.startDate, end: iteration.endDate },
      iterationId: scopedId
    })
  }
  const tasks = all
  upsertAgileBurndownSample(db, gid, today, remainingStoryPoints(tasks), now.toISOString())
  return buildAgileBurndownView({
    groupId: gid,
    tasks,
    today,
    samples: listAgileBurndownSamples(db, gid)
  })
}
