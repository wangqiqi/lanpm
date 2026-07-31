import { useCallback, useEffect, useState } from 'react'

const HIGHLIGHT_MS = 3200

/** Scroll to a message by id and pulse highlight (reply jump, pinned bar). */
export function useMessageJumpHighlight(): {
  jumpToMessage: (msgId: string) => void
  isJumpHighlighted: (msgId: string) => boolean
} {
  const [activeId, setActiveId] = useState<string | undefined>()

  useEffect(() => {
    if (!activeId) return
    const timer = window.setTimeout(() => setActiveId(undefined), HIGHLIGHT_MS)
    return () => clearTimeout(timer)
  }, [activeId])

  useEffect(() => {
    if (!activeId) return
    const el = document.querySelector(`[data-msg-id="${CSS.escape(activeId)}"]`)
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [activeId])

  const jumpToMessage = useCallback((msgId: string) => {
    setActiveId(msgId)
  }, [])

  const isJumpHighlighted = useCallback((msgId: string) => activeId === msgId, [activeId])

  return { jumpToMessage, isJumpHighlighted }
}
