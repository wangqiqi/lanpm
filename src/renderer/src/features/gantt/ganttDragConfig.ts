import { ViewMode } from 'gantt-task-react'

/** 左右拖动手柄宽度（库默认 8px 过小；宽度 < 2×handleWidth 会降级为无起止手柄的 smalltask） */
export const GANTT_HANDLE_WIDTH = 12

const MS_PER_DAY = 86_400_000

/** 与日期粒度对齐的拖拽步进，避免 5 分钟步进在周/月视图下过细导致手感迟滞 */
export function ganttTimeStepForView(viewMode: ViewMode): number {
  switch (viewMode) {
    case ViewMode.Day:
      return MS_PER_DAY
    case ViewMode.Week:
      return MS_PER_DAY
    case ViewMode.Month:
      return MS_PER_DAY
    default:
      return MS_PER_DAY
  }
}

export function ganttColumnWidthForView(viewMode: ViewMode): number {
  switch (viewMode) {
    case ViewMode.Month:
      return 300
    case ViewMode.Week:
      return 200
    case ViewMode.Day:
      return 72
    default:
      return 200
  }
}

/** Zoom multipliers for toolbar +/- (column width scale). */
export const GANTT_ZOOM_LEVELS = [0.6, 0.8, 1, 1.25, 1.5, 2] as const
export type GanttZoomLevel = (typeof GANTT_ZOOM_LEVELS)[number]

export function nextGanttZoomIn(current: number): number {
  const next = GANTT_ZOOM_LEVELS.find((z) => z > current + 0.001)
  return next ?? GANTT_ZOOM_LEVELS[GANTT_ZOOM_LEVELS.length - 1]!
}

export function nextGanttZoomOut(current: number): number {
  const prev = [...GANTT_ZOOM_LEVELS].reverse().find((z) => z < current - 0.001)
  return prev ?? GANTT_ZOOM_LEVELS[0]!
}
