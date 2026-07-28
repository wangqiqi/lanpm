import { Notification } from 'electron'
import type { ChatMessage } from '../../shared/chat/types'
import { resolveAppIconPath } from '../appIcon'

export function notifyIfMentioned(message: ChatMessage, localUserId: string): void {
  if (!message.mentions?.includes(localUserId)) return
  if (message.senderUserId === localUserId) return
  if (!Notification.isSupported()) return

  const preview =
    message.content.kind === 'text'
      ? message.content.text
      : message.content.kind === 'code'
        ? `[代码 · ${message.content.language}]`
        : '[新消息]'

  const icon = resolveAppIconPath()
  const n = new Notification({
    title: `${message.senderUserId} 提到了你`,
    body: preview.slice(0, 200),
    ...(icon ? { icon } : {})
  })
  n.show()
}
