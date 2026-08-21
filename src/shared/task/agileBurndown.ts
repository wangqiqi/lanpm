import type { Task } from './types.ts'
import { parseStoryPoints } from './storyPoints.ts'

export type BurndownPoint = {
  day: string
  remaining: number
}

export type AgileBurndownView = {
  groupId: string
  remaining: number
  total: number
  windowStart: string
  windowEnd: string
  samples: BurndownPoint[]
  ideal: BurndownPoint[]
  iterationId?: string
}

const YMD = /^\d{4}-\d{2}-\d{2}$/

export function remainingStoryPoints(tasks: readonly Task[]): number {
  let sum = 0
  for (const task of tasks) {
    if (task.deletedAt || task.status === 'done') continue
    const pts = parseStoryPoints(task.storyPoints)
    if (pts !== undefined) sum += pts
  }
  return sum
}

export function totalEstimatedStoryPoints(tasks: readonly Task[]): number {
  let sum = 0
  for (const task of tasks) {
    if (task.deletedAt) continue
    const pts = parseStoryPoints(task.storyPoints)
    if (pts !== undefined) sum += pts
  }
  return sum
}

export function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(Date.UTC(y!, m! - 1, d! + days))
  return dt.toISOString().slice(0, 10)
}

export function eachYmdInclusive(start: string, end: string): string[] {
  if (start > end) return []
  const out: string[] = []
  let cur = start
  while (cur <= end) {
    out.push(cur)
    cur = addDaysYmd(cur, 1)
  }
  return out
}

export function localYmd(now: Date): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function burndownWindow(tasks: readonly Task[], today: string): { start: string; end: string } {
  const days: string[] = []
  for (const task of tasks) {
    if (task.deletedAt) continue
    if (parseStoryPoints(task.storyPoints) === undefined) continue
    if (task.startDate && YMD.test(task.startDate)) days.push(task.startDate)
    if (task.endDate && YMD.test(task.endDate)) days.push(task.endDate)
  }
  let start = days.length > 0 ? days.reduce((a, b) => (a < b ? a : b)) : today
  let end = days.length > 0 ? days.reduce((a, b) => (a > b ? a : b)) : addDaysYmd(today, 13)
  if (end < today) end = today
  if (start > end) start = end
  if (start === end) end = addDaysYmd(start, 7)
  return { start, end }
}

/** Linear remaining from `total` on start day to 0 on end day (inclusive). */
export function idealBurndown(start: string, end: string, total: number): BurndownPoint[] {
  const days = eachYmdInclusive(start, end)
  if (days.length === 0) return []
  if (days.length === 1) return [{ day: days[0]!, remaining: 0 }]
  const last = days.length - 1
  return days.map((day, i) => ({
    day,
    remaining: Math.round((total * (last - i)) / last)
  }))
}

export function buildAgileBurndownView(input: {
  groupId: string
  tasks: readonly Task[]
  today: string
  samples: BurndownPoint[]
  window?: { start: string; end: string }
  iterationId?: string
}): AgileBurndownView {
  const remaining = remainingStoryPoints(input.tasks)
  const total = totalEstimatedStoryPoints(input.tasks)
  const { start, end } = input.window ?? burndownWindow(input.tasks, input.today)
  const byDay = new Map(input.samples.map((s) => [s.day, s.remaining]))
  byDay.set(input.today, remaining)
  const samples = [...byDay.entries()]
    .filter(([day]) => day >= start && day <= end && day <= input.today)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([day, value]) => ({ day, remaining: value }))
  return {
    groupId: input.groupId,
    remaining,
    total,
    windowStart: start,
    windowEnd: end,
    samples,
    ideal: idealBurndown(start, end, total),
    ...(input.iterationId ? { iterationId: input.iterationId } : {})
  }
}

export function burndownPolyline(
  points: BurndownPoint[],
  width: number,
  height: number,
  yMax: number
): string {
  if (points.length === 0 || width <= 0 || height <= 0) return ''
  const maxY = Math.max(yMax, 1)
  const last = Math.max(points.length - 1, 1)
  return points
    .map((p, i) => {
      const x = (i / last) * width
      const y = height - (Math.min(p.remaining, maxY) / maxY) * height
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}
