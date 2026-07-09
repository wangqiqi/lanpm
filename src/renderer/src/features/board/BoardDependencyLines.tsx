import { useLayoutEffect, useState, type RefObject } from 'react'
import {
  listFocusDependencyEdges,
  type BoardDependencyEdge
} from '@shared/task/boardRelations'
import type { Task } from '@shared/task/types'
import styles from './board.module.css'

interface DrawnEdge extends BoardDependencyEdge {
  x1: number
  y1: number
  x2: number
  y2: number
}

function cardRect(
  container: HTMLElement,
  taskId: string
): { left: number; top: number; width: number; height: number } | null {
  const safe =
    typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
      ? CSS.escape(taskId)
      : taskId.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  const el = container.querySelector(`[data-task-id="${safe}"]`)
  if (!(el instanceof HTMLElement)) return null
  const c = container.getBoundingClientRect()
  const r = el.getBoundingClientRect()
  return {
    left: r.left - c.left + container.scrollLeft,
    top: r.top - c.top + container.scrollTop,
    width: r.width,
    height: r.height
  }
}

function edgeGeometry(
  container: HTMLElement,
  edge: BoardDependencyEdge
): DrawnEdge | null {
  const from = cardRect(container, edge.fromTaskId)
  const to = cardRect(container, edge.toTaskId)
  if (!from || !to) return null
  return {
    ...edge,
    x1: from.left + from.width,
    y1: from.top + from.height / 2,
    x2: to.left,
    y2: to.top + to.height / 2
  }
}

function curvePath(e: DrawnEdge): string {
  const dx = Math.max(40, Math.abs(e.x2 - e.x1) * 0.45)
  return `M ${e.x1} ${e.y1} C ${e.x1 + dx} ${e.y1}, ${e.x2 - dx} ${e.y2}, ${e.x2} ${e.y2}`
}

interface BoardDependencyLinesProps {
  containerRef: RefObject<HTMLElement | null>
  focusTaskId: string | null
  tasks: Task[]
}

export default function BoardDependencyLines({
  containerRef,
  focusTaskId,
  tasks
}: BoardDependencyLinesProps): React.ReactElement | null {
  const [drawn, setDrawn] = useState<DrawnEdge[]>([])
  const [size, setSize] = useState({ w: 0, h: 0 })

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container || !focusTaskId) {
      setDrawn([])
      return
    }

    const recompute = (): void => {
      const edges = listFocusDependencyEdges(focusTaskId, tasks, { types: ['FS'] })
      const next: DrawnEdge[] = []
      for (const edge of edges) {
        const g = edgeGeometry(container, edge)
        if (g) next.push(g)
      }
      setDrawn(next)
      setSize({ w: container.scrollWidth, h: container.scrollHeight })
    }

    recompute()

    const scrollables = [
      container,
      ...Array.from(container.querySelectorAll<HTMLElement>('*')).filter(
        (el) => el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth
      )
    ]
    const ro = new ResizeObserver(recompute)
    ro.observe(container)
    for (const el of scrollables) {
      el.addEventListener('scroll', recompute, { passive: true })
    }
    window.addEventListener('resize', recompute)

    return () => {
      ro.disconnect()
      for (const el of scrollables) {
        el.removeEventListener('scroll', recompute)
      }
      window.removeEventListener('resize', recompute)
    }
  }, [containerRef, focusTaskId, tasks])

  if (!focusTaskId || drawn.length === 0 || size.w === 0) return null

  return (
    <svg
      className={styles.dependencyOverlay}
      width={size.w}
      height={size.h}
      viewBox={`0 0 ${size.w} ${size.h}`}
      aria-hidden
    >
      <defs>
        <marker
          id="lanpm-board-dep-arrow"
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="4"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L8,4 L0,8 Z" className={styles.dependencyArrow} />
        </marker>
      </defs>
      {drawn.map((e) => (
        <path
          key={`${e.fromTaskId}-${e.toTaskId}-${e.type}-${e.direction}`}
          d={curvePath(e)}
          className={
            e.direction === 'incoming'
              ? styles.dependencyLineIn
              : styles.dependencyLineOut
          }
          fill="none"
          markerEnd="url(#lanpm-board-dep-arrow)"
        />
      ))}
    </svg>
  )
}
