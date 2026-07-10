import { useLayoutEffect, useState, type RefObject } from 'react'
import {
  listAllDependencyEdges,
  listFocusDependencyEdges,
  type BoardDependencyEdge
} from '@shared/task/boardRelations'
import type { Task } from '@shared/task/types'
import styles from './board.module.css'

type EdgeEmphasis = 'dim' | 'incoming' | 'outgoing'

interface DrawnEdge extends BoardDependencyEdge {
  x1: number
  y1: number
  x2: number
  y2: number
  emphasis: EdgeEmphasis
}

function edgeKey(edge: BoardDependencyEdge): string {
  return `${edge.fromTaskId}-${edge.toTaskId}-${edge.type}`
}

function collectAnnotatedEdges(
  showAllFsLines: boolean,
  focusTaskId: string | null,
  tasks: Task[]
): Array<BoardDependencyEdge & { emphasis: EdgeEmphasis }> {
  const byKey = new Map<string, BoardDependencyEdge & { emphasis: EdgeEmphasis }>()

  if (showAllFsLines) {
    for (const edge of listAllDependencyEdges(tasks, { types: ['FS'] })) {
      byKey.set(edgeKey(edge), { ...edge, emphasis: 'dim' })
    }
  }

  if (focusTaskId) {
    for (const edge of listFocusDependencyEdges(focusTaskId, tasks, { types: ['FS'] })) {
      byKey.set(edgeKey(edge), { ...edge, emphasis: edge.direction })
    }
  }

  if (!showAllFsLines && !focusTaskId) return []
  return [...byKey.values()]
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
  edge: BoardDependencyEdge & { emphasis: EdgeEmphasis }
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

function lineClass(emphasis: EdgeEmphasis): string {
  if (emphasis === 'incoming') return styles.dependencyLineIn
  if (emphasis === 'outgoing') return styles.dependencyLineOut
  return styles.dependencyLineDim
}

interface BoardDependencyLinesProps {
  containerRef: RefObject<HTMLElement | null>
  focusTaskId: string | null
  showAllFsLines: boolean
  tasks: Task[]
}

export default function BoardDependencyLines({
  containerRef,
  focusTaskId,
  showAllFsLines,
  tasks
}: BoardDependencyLinesProps): React.ReactElement | null {
  const [drawn, setDrawn] = useState<DrawnEdge[]>([])
  const [size, setSize] = useState({ w: 0, h: 0 })

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container || (!showAllFsLines && !focusTaskId)) {
      setDrawn([])
      return
    }

    const recompute = (): void => {
      const annotated = collectAnnotatedEdges(showAllFsLines, focusTaskId, tasks)
      const next: DrawnEdge[] = []
      for (const edge of annotated) {
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
  }, [containerRef, focusTaskId, showAllFsLines, tasks])

  if (drawn.length === 0 || size.w === 0) return null

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
        <marker
          id="lanpm-board-dep-arrow-dim"
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="4"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L8,4 L0,8 Z" className={styles.dependencyArrowDim} />
        </marker>
      </defs>
      {drawn.map((e) => (
        <path
          key={`${e.fromTaskId}-${e.toTaskId}-${e.type}-${e.emphasis}`}
          d={curvePath(e)}
          className={lineClass(e.emphasis)}
          fill="none"
          markerEnd={
            e.emphasis === 'dim'
              ? 'url(#lanpm-board-dep-arrow-dim)'
              : 'url(#lanpm-board-dep-arrow)'
          }
        />
      ))}
    </svg>
  )
}
