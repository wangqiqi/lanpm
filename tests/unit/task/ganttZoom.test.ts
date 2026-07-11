import { describe, expect, it } from 'vitest'
import {
  GANTT_ZOOM_LEVELS,
  nextGanttZoomIn,
  nextGanttZoomOut
} from '../../../src/renderer/src/features/gantt/ganttDragConfig.ts'

describe('gantt zoom levels', () => {
  it('zooms in/out within bounds', () => {
    expect(nextGanttZoomIn(1)).toBe(1.25)
    expect(nextGanttZoomOut(1)).toBe(0.8)
    expect(nextGanttZoomIn(GANTT_ZOOM_LEVELS[GANTT_ZOOM_LEVELS.length - 1]!)).toBe(
      GANTT_ZOOM_LEVELS[GANTT_ZOOM_LEVELS.length - 1]
    )
    expect(nextGanttZoomOut(GANTT_ZOOM_LEVELS[0]!)).toBe(GANTT_ZOOM_LEVELS[0])
  })
})
