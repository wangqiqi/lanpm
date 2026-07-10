import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Task } from '@shared/task/types'
import { extractTaskRefQuery, filterTasksByQuery } from '@shared/chat/taskRefs'

export function useTaskSuggest(
  draft: string,
  tasks: Task[],
  enabled: boolean,
  onPick: (task: Task) => void,
  onDismiss: () => void
): {
  query: string | null
  candidates: Task[]
  activeIndex: number
  handleKeyDown: (e: React.KeyboardEvent) => boolean
} {
  const query = useMemo(() => {
    if (!enabled) return null
    return extractTaskRefQuery(draft)
  }, [draft, enabled])

  const candidates = useMemo(() => {
    if (query === null) return []
    return filterTasksByQuery(tasks, query)
  }, [tasks, query])

  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    setActiveIndex(0)
  }, [query, candidates.length])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent): boolean => {
      if (query === null || candidates.length === 0) return false
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, candidates.length - 1))
        return true
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
        return true
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        const picked = candidates[activeIndex]
        if (picked) onPick(picked)
        return true
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        onDismiss()
        return true
      }
      return false
    },
    [query, candidates, activeIndex, onPick, onDismiss]
  )

  return { query, candidates, activeIndex, handleKeyDown }
}
