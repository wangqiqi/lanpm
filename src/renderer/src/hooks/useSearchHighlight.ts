import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

type HighlightLocationState = {
  highlightTaskId?: string
  highlightMsgId?: string
}

const HIGHLIGHT_MS = 3200

/** Consumes `location.state` from GlobalSearch; scrolls target into view and pulses highlight. */
export function useSearchHighlight(
  kind: 'task' | 'msg',
  ready: boolean
): { highlightId: string | undefined; isHighlighted: (id: string) => boolean } {
  const location = useLocation()
  const state = (location.state as HighlightLocationState | null) ?? {}
  const rawId = kind === 'task' ? state.highlightTaskId : state.highlightMsgId
  const [activeId, setActiveId] = useState<string | undefined>()

  useEffect(() => {
    if (!rawId || !ready) return
    setActiveId(rawId)
    const timer = window.setTimeout(() => setActiveId(undefined), HIGHLIGHT_MS)
    return () => clearTimeout(timer)
  }, [rawId, ready])

  useEffect(() => {
    if (!activeId || !ready) return
    const attr = kind === 'task' ? 'data-task-id' : 'data-msg-id'
    const el = document.querySelector(`[${attr}="${CSS.escape(activeId)}"]`)
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [activeId, ready, kind])

  return {
    highlightId: activeId,
    isHighlighted: (id: string) => activeId === id
  }
}

/** Expands task-tree ancestors so a highlighted task node is visible. */
export function ancestorKeysForTask(taskId: string, tasks: { taskId: string; parentTaskId?: string }[]): string[] {
  const keys: string[] = []
  let current = tasks.find((t) => t.taskId === taskId)
  while (current?.parentTaskId) {
    keys.push(current.parentTaskId)
    current = tasks.find((t) => t.taskId === current!.parentTaskId)
  }
  return keys
}
