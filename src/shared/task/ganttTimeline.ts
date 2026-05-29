import { ViewMode, type Task as GanttTask } from 'gantt-task-react'

type DateUnit = 'year' | 'month' | 'day' | 'hour'

function addToDate(date: Date, amount: number, unit: DateUnit): Date {
  const next = new Date(date)
  switch (unit) {
    case 'year':
      next.setFullYear(next.getFullYear() + amount)
      break
    case 'month':
      next.setMonth(next.getMonth() + amount)
      break
    case 'day':
      next.setDate(next.getDate() + amount)
      break
    case 'hour':
      next.setHours(next.getHours() + amount)
      break
  }
  return next
}

function startOfDate(date: Date, unit: 'year' | 'month' | 'day' | 'hour'): Date {
  const next = new Date(date)
  switch (unit) {
    case 'year':
      next.setMonth(0, 1)
      next.setHours(0, 0, 0, 0)
      break
    case 'month':
      next.setDate(1)
      next.setHours(0, 0, 0, 0)
      break
    case 'day':
      next.setHours(0, 0, 0, 0)
      break
    case 'hour':
      next.setMinutes(0, 0, 0)
      break
  }
  return next
}

function getMonday(date: Date): Date {
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(date.getFullYear(), date.getMonth(), diff)
}

/** 与 gantt-task-react 内部 ganttDateRange 对齐，用于日历列标签推导 */
export function ganttDateRange(
  tasks: GanttTask[],
  viewMode: ViewMode,
  preStepsCount = 1
): [Date, Date] {
  if (tasks.length === 0) {
    const today = startOfDate(new Date(), 'day')
    return [today, addToDate(today, 7, 'day')]
  }

  let newStartDate = tasks[0]!.start
  let newEndDate = tasks[0]!.start

  for (const task of tasks) {
    if (task.start < newStartDate) newStartDate = task.start
    if (task.end > newEndDate) newEndDate = task.end
  }

  switch (viewMode) {
    case ViewMode.Year:
      newStartDate = startOfDate(addToDate(newStartDate, -1, 'year'), 'year')
      newEndDate = startOfDate(addToDate(newEndDate, 1, 'year'), 'year')
      break
    case ViewMode.Month:
      newStartDate = startOfDate(addToDate(newStartDate, -preStepsCount, 'month'), 'month')
      newEndDate = startOfDate(addToDate(newEndDate, 1, 'year'), 'year')
      break
    case ViewMode.Week:
      newStartDate = startOfDate(newStartDate, 'day')
      newStartDate = addToDate(getMonday(newStartDate), -7 * preStepsCount, 'day')
      newEndDate = startOfDate(newEndDate, 'day')
      newEndDate = addToDate(newEndDate, 1.5, 'month')
      break
    case ViewMode.Day:
      newStartDate = startOfDate(newStartDate, 'day')
      newStartDate = addToDate(newStartDate, -preStepsCount, 'day')
      newEndDate = startOfDate(newEndDate, 'day')
      newEndDate = addToDate(newEndDate, 19, 'day')
      break
    default:
      newStartDate = startOfDate(newStartDate, 'day')
      newEndDate = addToDate(newEndDate, 19, 'day')
  }

  return [newStartDate, newEndDate]
}

/** 与 gantt-task-react 内部 seedDates 对齐 */
export function seedGanttDates(startDate: Date, endDate: Date, viewMode: ViewMode): Date[] {
  const currentDate = new Date(startDate)
  const dates = [new Date(currentDate)]

  while (currentDate < endDate) {
    switch (viewMode) {
      case ViewMode.Year:
        currentDate.setFullYear(currentDate.getFullYear() + 1)
        break
      case ViewMode.Month:
        currentDate.setMonth(currentDate.getMonth() + 1)
        break
      case ViewMode.Week:
        currentDate.setDate(currentDate.getDate() + 7)
        break
      default:
        currentDate.setDate(currentDate.getDate() + 1)
        break
    }
    dates.push(new Date(currentDate))
  }

  return dates
}

export function computeGanttTimelineDates(
  tasks: GanttTask[],
  viewMode: ViewMode,
  preStepsCount = 1
): Date[] {
  const [start, end] = ganttDateRange(tasks, viewMode, preStepsCount)
  return seedGanttDates(start, end, viewMode)
}

export function formatWeekColumnLabel(weekStart: Date, locale: string): string {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const fmt = new Intl.DateTimeFormat(locale, { month: 'numeric', day: 'numeric' })
  return `${fmt.format(weekStart)}–${fmt.format(weekEnd)}`
}
