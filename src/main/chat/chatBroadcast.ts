import { BrowserWindow } from 'electron'
import type { ChatMessage } from '../../shared/chat/types'
import { CHAT_PUSH_CHANNEL } from '../../shared/chat/channels'

export function broadcastMessage(message: ChatMessage): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(CHAT_PUSH_CHANNEL, message)
  }
}
