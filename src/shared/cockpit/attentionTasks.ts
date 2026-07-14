import { getTaskScheduleHealth } from '../task/scheduleHealth'
import type { Task } from '../task/types'
import type { CockpitAttentionTask } from './types'

export const COCKPIT_ATTENTION_TASK_LIMIT = 8

export interface AttentionTaskInput
  extends Pick<
    Task,
    | 'taskId'
    | 'groupId'
    | 'title'
    | 'startDate'
    | 'endDate'
    | 'progressPercent'
    | 'status'
    | 'milestone'
    | 'createdAt'
    | 'deletedAt'
  > {
  projectName: string
  assigneeName?: string
}

function kindRank(kind: CockpitAttentionTask['kind']): number {
  return kind === 'overdue' ? 0 : 1
}

function endDateSortKey(endDate: string | undefined): string {
  return endDate ?? '9999-99-99'
}

export function buildAttentionTasks(
  tasks: AttentionTaskInput[],
  limit: number = COCKPIT_ATTENTION_TASK_LIMIT,
  refDate: Date = new Date()
): CockpitAttentionTask[] {
  const flagged: CockpitAttentionTask[] = []

  for (const task of tasks) {
    if (task.deletedAt || task.status === 'done') continue
    const health = getTaskScheduleHealth(task, refDate)
    if (health !== 'overdue' && health !== 'behind') continue

    flagged.push({
      taskId: task.taskId,
      groupId: task.groupId,
      projectName: task.projectName,
      title: task.title,
      assigneeName: task.assigneeName,
      kind: health === 'overdue' ? 'overdue' : 'behind',
      endDate: task.endDate
    })
  }

  flagged.sort((a, b) => {
    const byKind = kindRank(a.kind) - kindRank(b.kind)
    if (byKind !== 0) return byKind
    const byEnd = endDateSortKey(a.endDate).localeCompare(endDateSortKey(b.endDate))
    if (byEnd !== 0) return byEnd
    return a.title.localeCompare(b.title, 'zh-CN')
  })

  return flagged.slice(0, Math.max(0, limit))
}
