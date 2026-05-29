import { useEffect, useRef } from 'react'
import type { ChatMessage } from '@shared/chat/types'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { formatAppError } from '@renderer/i18n/formatAppError'
import { useUiStore } from '@renderer/stores/uiStore'
import { useBadgeStore } from '@renderer/stores/badgeStore'

/** 会话可见时标记他人消息已读（M2-06） */
export function useMarkRead(groupId: string, messages: ChatMessage[], localUserId?: string): void {
  const { message } = useLanpmApp()
  const markedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    markedRef.current = new Set()
  }, [groupId])

  useEffect(() => {
    if (!groupId || !localUserId || messages.length === 0) return

    const pending = messages
      .filter((m) => m.senderUserId !== localUserId)
      .map((m) => m.msgId)
      .filter((id) => !markedRef.current.has(id))

    if (pending.length === 0) return

    const timer = window.setTimeout(() => {
      void getLanpmApi()
        .chat.markRead(groupId, pending)
        .then(() => {
          for (const id of pending) markedRef.current.add(id)
          void useBadgeStore.getState().refresh(groupId)
        })
        .catch((err: unknown) => {
          message.error(
            formatAppError(err, useUiStore.getState().locale, 'chat.markReadFailed')
          )
        })
    }, 300)

    return () => window.clearTimeout(timer)
  }, [groupId, localUserId, messages, message])
}
