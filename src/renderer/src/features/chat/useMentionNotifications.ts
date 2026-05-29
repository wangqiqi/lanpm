import { useEffect, useRef } from 'react'
import type { ChatMessage } from '@shared/chat/types'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { useIdentityStore } from '@renderer/stores/identityStore'
import { useI18n } from '@renderer/i18n/useI18n'

const notifiedIds = new Set<string>()

/** 浏览器预览：@提及 时 Web Notification；Electron 由主进程处理 */
export function useMentionNotifications(groupId: string): void {
  const { t } = useI18n()
  const userId = useIdentityStore((s) => s.user?.userId)
  const apiRef = useRef(getLanpmApi())

  const previewBody = (message: ChatMessage): string => {
    if (message.content.kind === 'text') return message.content.text
    if (message.content.kind === 'code') {
      return t('chat.notificationCodePreview', { language: message.content.language })
    }
    return t('chat.notificationNewMessage')
  }

  useEffect(() => {
    if (apiRef.current.platform !== 'browser') return
    if (!userId) return

    const unsub = apiRef.current.chat.onMessage((message) => {
      if (message.groupId !== groupId) return
      if (!message.mentions?.includes(userId)) return
      if (message.senderUserId === userId) return
      if (notifiedIds.has(message.msgId)) return
      notifiedIds.add(message.msgId)

      if (typeof Notification === 'undefined') return
      const show = (): void => {
        new Notification(
          t('chat.notificationMentionTitle', { sender: message.senderUserId }),
          {
            body: previewBody(message).slice(0, 200)
          }
        )
      }
      if (Notification.permission === 'granted') {
        show()
      } else if (Notification.permission !== 'denied') {
        void Notification.requestPermission().then((p) => {
          if (p === 'granted') show()
        })
      }
    })

    return unsub
  }, [groupId, userId, t])
}
