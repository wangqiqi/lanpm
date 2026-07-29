import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChatScrollMemory } from '@shared/chat/scrollMemory'
import {
  classifyMessageCountIncrease,
  shouldScrollToBottomOnInitialLoad
} from '@shared/chat/scrollMemory'
import { isPinnedToBottom } from '@shared/chat/scrollPin'
import {
  captureScrollMemory,
  restoreScrollPosition
} from '@renderer/features/chat/chatScrollMemoryDom'

/** 单会话内按群记忆滚动位置（不跨重启） */
const scrollMemoryByGroup = new Map<string, ChatScrollMemory>()

interface UseNewMessageScrollOptions {
  listRef: React.RefObject<HTMLDivElement | null>
  messageCount: number
  lastSenderUserId: string | undefined
  currentUserId: string | undefined
  groupKey: string
}

function applyScrollMemory(
  listRef: React.RefObject<HTMLDivElement | null>,
  memory: ChatScrollMemory | undefined
): void {
  const el = listRef.current
  if (!el) return
  restoreScrollPosition(el, memory)
}

function scrollToEnd(listRef: React.RefObject<HTMLDivElement | null>): void {
  const el = listRef.current
  if (el) el.scrollTop = el.scrollHeight
}

/** WX-01 — scroll pin +「N 条新消息」+ 会话内滚动记忆 */
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
    prevCountRef.current = 0
    setPendingNewCount(0)

    const memory = scrollMemoryByGroup.get(groupKey)
    const syncPinned = (): void => {
      const el = listRef.current
      if (!el) return
      if (shouldScrollToBottomOnInitialLoad(memory)) {
        scrollToEnd(listRef)
        pinnedRef.current = true
      } else {
        applyScrollMemory(listRef, memory)
        pinnedRef.current = isPinnedToBottom(el)
      }
    }

    syncPinned()
    requestAnimationFrame(() => {
      syncPinned()
      requestAnimationFrame(syncPinned)
    })
  }, [groupKey, listRef])

  useEffect(() => {
    const el = listRef.current
    if (!el) return

    const prevCount = prevCountRef.current
    const delta = messageCount - prevCount
    prevCountRef.current = messageCount
    const kind = classifyMessageCountIncrease(prevCount, delta, el.scrollTop)
    if (kind === 'none' || kind === 'prepend') return

    const memory = scrollMemoryByGroup.get(groupKey)

    if (kind === 'initial') {
      if (shouldScrollToBottomOnInitialLoad(memory)) {
        scrollToEnd(listRef)
        requestAnimationFrame(() => scrollToEnd(listRef))
        pinnedRef.current = true
      } else {
        applyScrollMemory(listRef, memory)
        requestAnimationFrame(() => {
          applyScrollMemory(listRef, memory)
          const node = listRef.current
          if (node) pinnedRef.current = isPinnedToBottom(node)
        })
      }
      setPendingNewCount(0)
      return
    }

    const ownNew = lastSenderUserId != null && lastSenderUserId === currentUserId

    if (pinnedRef.current || ownNew) {
      scrollToEnd(listRef)
      setPendingNewCount(0)
    } else {
      setPendingNewCount((n) => n + delta)
    }
  }, [messageCount, lastSenderUserId, currentUserId, listRef, groupKey])

  const onMessagesScroll = useCallback(() => {
    const el = listRef.current
    if (!el) return
    const pinned = isPinnedToBottom(el)
    pinnedRef.current = pinned
    if (pinned) setPendingNewCount(0)
    scrollMemoryByGroup.set(groupKey, captureScrollMemory(el))
  }, [listRef, groupKey])

  const jumpToLatest = useCallback(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    pinnedRef.current = true
    setPendingNewCount(0)
    scrollMemoryByGroup.set(groupKey, { pinned: true })
  }, [listRef, groupKey])

  return { pendingNewCount, onMessagesScroll, jumpToLatest }
}
