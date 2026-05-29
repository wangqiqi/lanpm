import { buildBoardRelationMap } from './boardRelations'
import type { Task } from './types'
import type { TaskDependency } from './dependency'
import { taskFamilyBarColors } from './taskFamilyColors'

/** gantt-task-react 任务条（与库类型对齐的最小集） */
export interface GanttBarTask {
  id: string
  name: string
  type: 'task' | 'milestone' | 'project'
  start: Date
  end: Date
  progress: number
  dependencies?: string[]
  styles?: {
    backgroundColor?: string
    backgroundSelectedColor?: string
    progressColor?: string
    progressSelectedColor?: string
  }
  isDisabled?: boolean
  project?: string
}

const DEFAULT_SPAN_DAYS = 7

function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}

function formatYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function defaultScheduleForTask(task: Task): { startDate: string; endDate: string } {
  if (task.startDate && task.endDate) {
    return { startDate: task.startDate, endDate: task.endDate }
  }
  const base = task.createdAt ? new Date(task.createdAt) : new Date()
  base.setHours(0, 0, 0, 0)
  const end = new Date(base)
  end.setDate(end.getDate() + DEFAULT_SPAN_DAYS)
  return { startDate: formatYmd(base), endDate: formatYmd(end) }
}

/** 将 LanPM 任务转为 gantt-task-react 数据（FS 依赖映射为 dependencies 数组） */
export function tasksToGanttBars(tasks: Task[], dependencies: TaskDependency[]): GanttBarTask[] {
  const depMap = new Map<string, string[]>()
  for (const dep of dependencies) {
    if (dep.type !== 'FS') continue
    const list = depMap.get(dep.toTaskId) ?? []
    list.push(dep.fromTaskId)
    depMap.set(dep.toTaskId, list)
  }

  const relationMap = buildBoardRelationMap(tasks)

  return tasks
    .filter((t) => !t.deletedAt)
    .map((task) => {
      const { startDate, endDate } = defaultScheduleForTask(task)
      const start = parseYmd(startDate)
      let end = parseYmd(endDate)
      if (task.milestone) {
        end = new Date(start)
      } else if (end <= start) {
        end = new Date(start)
        end.setDate(end.getDate() + 1)
      }

      const familyIndex = relationMap.get(task.taskId)?.familyIndex ?? -1
      const familyBar = taskFamilyBarColors(familyIndex)

      return {
        id: task.taskId,
        name: task.milestone ? `◆ ${task.title}` : task.title,
        type: task.milestone ? 'milestone' : 'task',
        start,
        end,
        progress: Math.min(100, Math.max(0, task.progressPercent)) / 100,
        dependencies: depMap.get(task.taskId),
        styles: task.milestone
          ? {
              backgroundColor: '#f59e0b',
              backgroundSelectedColor: '#d97706',
              progressColor: '#fbbf24',
              progressSelectedColor: '#f59e0b'
            }
          : familyBar
      }
    })
}

export function ganttDatesToYmd(start: Date, end: Date, milestone?: boolean): {
  startDate: string
  endDate: string
} {
  if (milestone) {
    const d = formatYmd(start)
    return { startDate: d, endDate: d }
  }
  return { startDate: formatYmd(start), endDate: formatYmd(end) }
}
