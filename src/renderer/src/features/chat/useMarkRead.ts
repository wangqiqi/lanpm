import { useEffect, useRef } from 'react'
import { message } from 'antd'
import type { ChatMessage } from '@shared/chat/types'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { translate } from '@renderer/i18n/messages'
import { useUiStore } from '@renderer/stores/uiStore'

/** 会话可见时标记他人消息已读（M2-06） */
export function useMarkRead(groupId: string, messages: ChatMessage[], localUserId?: string): void {
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
        })
        .catch(() => {
          message.error(translate(useUiStore.getState().locale, 'chat.markReadFailed'))
        })
    }, 300)

    return () => window.clearTimeout(timer)
  }, [groupId, localUserId, messages])
}
