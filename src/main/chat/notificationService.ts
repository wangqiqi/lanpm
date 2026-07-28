import type { ChatMessage } from '../../shared/chat/types'
import { showDesktopNotification } from '../desktopNotification'

export function notifyIfMentioned(message: ChatMessage, localUserId: string): void {
  if (!message.mentions?.includes(localUserId)) return
  if (message.senderUserId === localUserId) return

  const preview =
    message.content.kind === 'text'
      ? message.content.text
      : message.content.kind === 'code'
        ? `[代码 · ${message.content.language}]`
        : '[新消息]'

  showDesktopNotification(`${message.senderUserId} 提到了你`, preview.slice(0, 200))
}
