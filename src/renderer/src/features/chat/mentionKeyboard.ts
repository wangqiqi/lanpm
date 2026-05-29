import { useCallback, useEffect, useMemo, useState } from 'react'
import type { GroupMemberView } from '@shared/chat/members'

export function useMentionSuggest(
  draft: string,
  members: GroupMemberView[],
  onPick: (displayName: string) => void,
  onDismiss: () => void
): {
  query: string | null
  candidates: GroupMemberView[]
  activeIndex: number
  handleKeyDown: (e: React.KeyboardEvent) => boolean
} {
  const query = useMemo(() => {
    const match = /(?:^|\s)@([^\s@]*)$/.exec(draft)
    return match ? match[1]!.toLowerCase() : null
  }, [draft])

  const candidates = useMemo(() => {
    if (query === null) return []
    return members.filter((m) => {
      const name = m.displayName.toLowerCase()
      const id = m.userId.toLowerCase()
      return name.includes(query) || id.includes(query)
    })
  }, [members, query])

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
        if (picked) onPick(picked.displayName)
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
