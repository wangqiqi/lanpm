import {
  buildGanttTableRows,
  ganttTableToCsv,
  ganttTableToMarkdown
} from '@shared/task/ganttTableExport'
import type { Task } from '@shared/task/types'

function downloadUtf8File(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportGanttTaskTable(
  tasks: Task[],
  format: 'md' | 'csv',
  basename: string,
  heading: string
): void {
  const rows = buildGanttTableRows(tasks)
  if (rows.length === 0) {
    throw new Error('err.ganttTableExportEmpty')
  }
  if (format === 'csv') {
    downloadUtf8File(ganttTableToCsv(rows), `${basename}.csv`, 'text/csv')
    return
  }
  downloadUtf8File(
    ganttTableToMarkdown(rows, { heading }),
    `${basename}.md`,
    'text/markdown'
  )
}
