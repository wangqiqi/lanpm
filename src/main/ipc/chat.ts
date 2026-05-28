import { ipcMain } from 'electron'
import { listGroupMembers, listGroupMessages, sendCodeMessage, sendTextMessage } from '../chat/chatService'
import { markMessagesRead } from '../chat/readReceiptService'
import { getDatabase } from '../storage'
import { CHAT_IPC } from '../../shared/chat/channels'

export function registerChatIpc(): void {
  ipcMain.handle(CHAT_IPC.listMessages, (_event, groupId: string) => {
    if (typeof groupId !== 'string' || !groupId) {
      throw new Error('groupId required')
    }
    return listGroupMessages(getDatabase(), groupId)
  })

  ipcMain.handle(CHAT_IPC.sendText, (_event, groupId: string, text: string) => {
    if (typeof groupId !== 'string' || !groupId) {
      throw new Error('groupId required')
    }
    return sendTextMessage(getDatabase(), groupId, text)
  })

  ipcMain.handle(CHAT_IPC.listMembers, (_event, groupId: string) => {
    if (typeof groupId !== 'string' || !groupId) {
      throw new Error('groupId required')
    }
    return listGroupMembers(getDatabase(), groupId)
  })

  ipcMain.handle(
    CHAT_IPC.sendCode,
    (_event, groupId: string, code: string, languageHint?: string, theme?: 'light' | 'dark') => {
      if (typeof groupId !== 'string' || !groupId) {
        throw new Error('groupId required')
      }
      return sendCodeMessage(getDatabase(), groupId, code, languageHint, theme)
    }
  )

  ipcMain.handle(CHAT_IPC.markRead, (_event, groupId: string, msgIds: string[]) => {
    if (typeof groupId !== 'string' || !groupId) {
      throw new Error('groupId required')
    }
    if (!Array.isArray(msgIds)) {
      throw new Error('msgIds required')
    }
    return markMessagesRead(getDatabase(), groupId, msgIds)
  })
}
