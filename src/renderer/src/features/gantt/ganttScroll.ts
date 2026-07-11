/** 按行高滚动 gantt-task-react 图表，使目标任务条进入视区 */
export function scrollGanttChartToTask(
  chartRoot: HTMLElement,
  taskId: string,
  rowHeight: number,
  barIdsInOrder: string[]
): void {
  const index = barIdsInOrder.indexOf(taskId)
  if (index < 0) return

  const scrollEl =
    chartRoot.querySelector<HTMLElement>('[class*="horizontalContainer"]') ??
    chartRoot.querySelector<HTMLElement>('[class*="ganttVerticalContainer"]')
  if (!scrollEl) return

  const targetTop = index * rowHeight
  const offset = Math.max(0, scrollEl.clientHeight * 0.25)
  scrollEl.scrollTo({
    top: Math.max(0, targetTop - offset),
    behavior: 'smooth'
  })
}

/** Bottom horizontal scrollbar of gantt-task-react (always ~1.2rem tall). */
function findGanttHorizontalScrollEl(chartRoot: HTMLElement): HTMLElement | null {
  for (const el of chartRoot.querySelectorAll<HTMLElement>('div')) {
    const st = getComputedStyle(el)
    if (
      (st.overflowX === 'auto' || st.overflowX === 'scroll') &&
      el.clientHeight > 0 &&
      el.clientHeight <= 28
    ) {
      return el
    }
  }
  return null
}

function findDateColumnIndex(dates: Date[], target: Date): number {
  const tv = new Date(target)
  tv.setHours(0, 0, 0, 0)
  const t = tv.valueOf()
  const exact = dates.findIndex(
    (d, i) =>
      t >= d.valueOf() && i + 1 < dates.length && t < dates[i + 1]!.valueOf()
  )
  if (exact >= 0) return exact
  const next = dates.findIndex((d) => d.valueOf() >= t)
  if (next >= 0) return next
  return Math.max(0, dates.length - 1)
}

/**
 * Horizontally center the chart on `targetDate` (default: today).
 * Syncs the body viewport and the bottom scrollbar so library scrollX stays consistent.
 */
export function scrollGanttChartToDateCentered(
  chartRoot: HTMLElement,
  columnWidth: number,
  dates: Date[],
  targetDate: Date = new Date()
): void {
  if (dates.length === 0 || columnWidth <= 0) return

  const calendarSvg = chartRoot.querySelector('svg .calendar')?.closest('svg')
  const ganttBody = calendarSvg?.parentElement
  if (!ganttBody) return

  const index = findDateColumnIndex(dates, targetDate)
  const viewport = ganttBody.clientWidth
  const targetLeft = Math.max(
    0,
    Math.round(columnWidth * index + columnWidth / 2 - viewport / 2)
  )

  ganttBody.scrollLeft = targetLeft
  const hScroll = findGanttHorizontalScrollEl(chartRoot)
  if (hScroll) {
    hScroll.scrollLeft = targetLeft
    hScroll.dispatchEvent(new Event('scroll'))
  }
}
