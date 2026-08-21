import { taskDurationDays } from './criticalPath.ts'
import type { Task } from './types.ts'

export const GANTT_TABLE_COLUMNS = [
  'taskId',
  'title',
  'status',
  'startDate',
  'endDate',
  'durationDays',
  'predecessors'
] as const

export type GanttTableColumn = (typeof GANTT_TABLE_COLUMNS)[number]

export interface GanttTableRow {
  taskId: string
  title: string
  status: string
  startDate: string
  endDate: string
  durationDays: string
  predecessors: string
}

const UTF8_BOM = '\uFEFF'

function predecessorCell(task: Task): string {
  const incoming = (task.dependencies ?? []).filter((d) => d.toTaskId === task.taskId)
  return incoming.map((d) => `${d.fromTaskId}(${d.type})`).join('; ')
}

export function buildGanttTableRows(tasks: Task[]): GanttTableRow[] {
  return tasks
    .filter((t) => !t.deletedAt)
    .map((task) => {
      const dated = Boolean(task.startDate && task.endDate)
      return {
        taskId: task.taskId,
        title: task.title,
        status: task.status,
        startDate: task.startDate ?? '',
        endDate: task.endDate ?? '',
        durationDays: dated ? String(taskDurationDays(task)) : '',
        predecessors: predecessorCell(task)
      }
    })
}

export function csvEscapeField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function ganttTableToCsv(rows: GanttTableRow[]): string {
  const header = GANTT_TABLE_COLUMNS.join(',')
  const body = rows
    .map((row) => GANTT_TABLE_COLUMNS.map((col) => csvEscapeField(row[col])).join(','))
    .join('\n')
  return `${UTF8_BOM}${header}\n${body}${body ? '\n' : ''}`
}

function mdEscapeCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>')
}

export function ganttTableToMarkdown(
  rows: GanttTableRow[],
  options?: { heading?: string }
): string {
  const heading = options?.heading?.trim() || 'Gantt task export'
  const header = `| ${GANTT_TABLE_COLUMNS.join(' | ')} |`
  const sep = `| ${GANTT_TABLE_COLUMNS.map(() => '---').join(' | ')} |`
  const body = rows
    .map((row) => `| ${GANTT_TABLE_COLUMNS.map((col) => mdEscapeCell(row[col])).join(' | ')} |`)
    .join('\n')
  const lines = [`# ${heading}`, '', header, sep]
  if (body) lines.push(body)
  lines.push('')
  return lines.join('\n')
}
