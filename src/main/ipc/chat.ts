import { BrowserWindow, ipcMain } from 'electron'
import {
  listGroupMembers,
  listGroupMessages,
  sendCodeMessage,
  pickAndSendFileMessage,
  sendFileMessage,
  sendTextMessage
} from '../chat/chatService'
import { captureAndSendScreenshot } from '../screenshot/screenshotService'
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

  ipcMain.handle(CHAT_IPC.pickAndSendFile, (event, groupId: string) => {
    if (typeof groupId !== 'string' || !groupId) {
      throw new Error('groupId required')
    }
    const parent = BrowserWindow.fromWebContents(event.sender)
    return pickAndSendFileMessage(getDatabase(), groupId, parent)
  })

  ipcMain.handle(CHAT_IPC.sendFile, (_event, groupId: string, filePath: string) => {
    if (typeof groupId !== 'string' || !groupId) {
      throw new Error('groupId required')
    }
    if (typeof filePath !== 'string' || !filePath) {
      throw new Error('filePath required')
    }
    return sendFileMessage(getDatabase(), groupId, filePath)
  })

  ipcMain.handle(CHAT_IPC.captureAndSendScreenshot, (_event, groupId: string) => {
    if (typeof groupId !== 'string' || !groupId) {
      throw new Error('groupId required')
    }
    return captureAndSendScreenshot(groupId)
  })

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
