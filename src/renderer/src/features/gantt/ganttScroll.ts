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
