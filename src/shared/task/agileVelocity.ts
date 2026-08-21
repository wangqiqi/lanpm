import type { Task } from './types.ts'
import type { AgileIteration } from './agileIteration.ts'
import { parseStoryPoints } from './storyPoints.ts'

export type AgileVelocityBar = {
  iterationId: string
  name: string
  startDate: string
  endDate: string
  completedPoints: number
}

export type AgileVelocityView = {
  groupId: string
  bars: AgileVelocityBar[]
}

export type VelocityBarRect = {
  iterationId: string
  x: number
  y: number
  width: number
  height: number
}

/** Done + estimated + in this iteration. Unestimated and non-done skip. */
export function completedPointsInIteration(
  tasks: readonly Task[],
  iterationId: string
): number {
  let sum = 0
  for (const task of tasks) {
    if (task.deletedAt) continue
    if (task.iterationId !== iterationId) continue
    if (task.status !== 'done') continue
    const pts = parseStoryPoints(task.storyPoints)
    if (pts !== undefined) sum += pts
  }
  return sum
}

export function buildAgileVelocityView(
  groupId: string,
  iterations: readonly AgileIteration[],
  tasks: readonly Task[]
): AgileVelocityView {
  const bars = [...iterations]
    .sort((a, b) => {
      if (a.startDate !== b.startDate) return a.startDate < b.startDate ? -1 : 1
      return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0
    })
    .map((iteration) => ({
      iterationId: iteration.iterationId,
      name: iteration.name,
      startDate: iteration.startDate,
      endDate: iteration.endDate,
      completedPoints: completedPointsInIteration(tasks, iteration.iterationId)
    }))
  return { groupId, bars }
}

/** Simple column bars in viewBox space. Empty or zero-max → no rects. */
export function velocityBarRects(
  bars: readonly AgileVelocityBar[],
  width: number,
  height: number
): VelocityBarRect[] {
  if (bars.length === 0 || width <= 0 || height <= 0) return []
  const max = Math.max(...bars.map((b) => b.completedPoints), 0)
  if (max <= 0) return []
  const gap = 2
  const slot = width / bars.length
  const barW = Math.max(slot - gap, 1)
  return bars.map((bar, i) => {
    const h = (bar.completedPoints / max) * height
    return {
      iterationId: bar.iterationId,
      x: i * slot,
      y: height - h,
      width: barW,
      height: h
    }
  })
}
