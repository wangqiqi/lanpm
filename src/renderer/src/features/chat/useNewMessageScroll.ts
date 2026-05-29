import { useCallback, useEffect, useRef, useState } from 'react'
import { isPinnedToBottom } from '@shared/chat/scrollPin'

interface UseNewMessageScrollOptions {
  listRef: React.RefObject<HTMLDivElement | null>
  messageCount: number
  lastSenderUserId: string | undefined
  currentUserId: string | undefined
  groupKey: string
}

/** WX-01 — scroll pin +「N 条新消息」计数（用户上滑时收到新消息）。 */
export function useNewMessageScroll({
  listRef,
  messageCount,
  lastSenderUserId,
  currentUserId,
  groupKey
}: UseNewMessageScrollOptions): {
  pendingNewCount: number
  onMessagesScroll: () => void
  jumpToLatest: () => void
} {
  const pinnedRef = useRef(true)
  const prevCountRef = useRef(messageCount)
  const [pendingNewCount, setPendingNewCount] = useState(0)

  useEffect(() => {
    pinnedRef.current = true
    prevCountRef.current = messageCount
    setPendingNewCount(0)
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [groupKey, listRef])

  useEffect(() => {
    const el = listRef.current
    if (!el) return

    const delta = messageCount - prevCountRef.current
    prevCountRef.current = messageCount
    if (delta <= 0) return

    const ownNew = lastSenderUserId != null && lastSenderUserId === currentUserId

    if (pinnedRef.current || ownNew) {
      el.scrollTop = el.scrollHeight
      setPendingNewCount(0)
    } else {
      setPendingNewCount((n) => n + delta)
    }
  }, [messageCount, lastSenderUserId, currentUserId, listRef])

  const onMessagesScroll = useCallback(() => {
    const el = listRef.current
    if (!el) return
    const pinned = isPinnedToBottom(el)
    pinnedRef.current = pinned
    if (pinned) setPendingNewCount(0)
  }, [listRef])

  const jumpToLatest = useCallback(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    pinnedRef.current = true
    setPendingNewCount(0)
  }, [listRef])

  return { pendingNewCount, onMessagesScroll, jumpToLatest }
}
