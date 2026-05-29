import { ViewMode } from 'gantt-task-react'
import type { LocaleId } from '@renderer/i18n/types'
import { formatWeekColumnLabel } from '@shared/task/ganttTimeline'

const WEEK_LABEL_PATTERN = /^W\d+/

export function patchGanttCalendarLabels(
  root: HTMLElement,
  dates: Date[],
  viewMode: ViewMode,
  columnWidth: number,
  locale: LocaleId
): void {
  if (viewMode !== ViewMode.Week || dates.length === 0 || columnWidth <= 0) return

  const texts = root.querySelectorAll('.calendar text')
  for (const node of texts) {
    const textEl = node as SVGTextElement
    const content = textEl.textContent?.trim() ?? ''
    if (!WEEK_LABEL_PATTERN.test(content)) continue

    const x = Number.parseFloat(textEl.getAttribute('x') ?? '0')
    const index = Math.max(0, Math.min(dates.length - 1, Math.round(x / columnWidth)))
    const date = dates[index]
    if (!date) continue

    textEl.textContent = formatWeekColumnLabel(date, locale)
  }
}
