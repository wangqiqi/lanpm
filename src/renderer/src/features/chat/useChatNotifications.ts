import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import type { ChatMessage } from '@shared/chat/types'
import { messagePreviewText } from '@shared/chat/messagePreview'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { showDesktopNotification } from '@renderer/platform/desktopNotification'
import { useIdentityStore } from '@renderer/stores/identityStore'
import { useNotificationPrefsStore } from '@renderer/stores/notificationPrefsStore'
import { useI18n } from '@renderer/i18n/useI18n'
import { groupViewPath } from '@renderer/routes/paths'

const notifiedIds = new Set<string>()

function shouldSuppressNotification(
  message: ChatMessage,
  pathname: string,
  isMention: boolean,
  notifyAll: boolean
): boolean {
  if (isMention) return false
  if (!notifyAll) return true

  const onSameChat = pathname === groupViewPath(message.groupId, 'chat')
  const windowActive = typeof document !== 'undefined' && document.hasFocus() && !document.hidden
  return windowActive && onSameChat
}

function notificationBody(message: ChatMessage, t: ReturnType<typeof useI18n>['t']): string {
  const preview = messagePreviewText(message)
  if (preview) return preview.slice(0, 200)
  if (message.content.kind === 'code') {
    return t('chat.notificationCodePreview', { language: message.content.language })
  }
  return t('chat.notificationNewMessage')
}

/** WX-06 — @提及始终通知；可选「全部新消息」在非当前聊天或窗口失焦时通知。 */
export function useChatNotifications(): void {
  const { t } = useI18n()
  const location = useLocation()
  const userId = useIdentityStore((s) => s.user?.userId)
  const notifyAll = useNotificationPrefsStore((s) => s.notifyAllMessages)
  const hydratePrefs = useNotificationPrefsStore((s) => s.hydrate)
  const pathnameRef = useRef(location.pathname)
  pathnameRef.current = location.pathname

  useEffect(() => {
    hydratePrefs()
  }, [hydratePrefs])

  useEffect(() => {
    if (!userId) return

    const unsub = getLanpmApi().chat.onMessage((message) => {
      if (message.senderUserId === userId) return
      if (notifiedIds.has(message.msgId)) return
      notifiedIds.add(message.msgId)

      const isMention = Boolean(message.mentions?.includes(userId))
      if (shouldSuppressNotification(message, pathnameRef.current, isMention, notifyAll)) return

      const title = isMention
        ? t('chat.notificationMentionTitle', { sender: message.senderUserId })
        : t('chat.notificationMessageTitle', { sender: message.senderUserId })

      showDesktopNotification(title, notificationBody(message, t))
    })

    return unsub
  }, [userId, notifyAll, t])
}
