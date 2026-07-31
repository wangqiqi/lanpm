import { BrowserWindow, ipcMain } from 'electron'
import {
  listGroupMembers,
  listGroupMessages,
  listOlderGroupMessages,
  sendCodeMessage,
  pickAndSendFileMessage,
  recallMessage,
  sendExistingFileMessage,
  sendFileMessage,
  sendTextMessage,
  sendTaskRefMessage,
  retryFailedMessage,
  editTextMessage,
  listPinnedMessageIds,
  togglePinnedMessage,
  forwardMessageToGroup
} from '../chat/chatService'
import { captureAndSendScreenshot } from '../screenshot/screenshotService'
import { markMessagesRead } from '../chat/readReceiptService'
import { getDatabase } from '../storage'
import { getMessageById } from '../storage/repositories/messageRepository'
import { CHAT_IPC, type SendChatOptions } from '../../shared/chat/channels'

export function registerChatIpc(): void {
  ipcMain.handle(CHAT_IPC.listMessages, (_event, groupId: string) => {
    if (typeof groupId !== 'string' || !groupId) {
      throw new Error('groupId required')
    }
    return listGroupMessages(getDatabase(), groupId)
  })

  ipcMain.handle(
    CHAT_IPC.loadOlderMessages,
    (_event, groupId: string, beforeLamportTs: number) => {
      if (typeof groupId !== 'string' || !groupId) {
        throw new Error('groupId required')
      }
      if (typeof beforeLamportTs !== 'number' || !Number.isFinite(beforeLamportTs)) {
        throw new Error('beforeLamportTs required')
      }
      return listOlderGroupMessages(getDatabase(), groupId, beforeLamportTs)
    }
  )

  ipcMain.handle(
    CHAT_IPC.sendText,
    (_event, groupId: string, text: string, options?: SendChatOptions) => {
      if (typeof groupId !== 'string' || !groupId) {
        throw new Error('groupId required')
      }
      return sendTextMessage(getDatabase(), groupId, text, options)
    }
  )

  ipcMain.handle(CHAT_IPC.sendTaskRef, (_event, groupId: string, taskId: string) => {
    if (typeof groupId !== 'string' || !groupId) throw new Error('groupId required')
    if (typeof taskId !== 'string' || !taskId) throw new Error('taskId required')
    return sendTaskRefMessage(getDatabase(), groupId, taskId)
  })

  ipcMain.handle(CHAT_IPC.listMembers, (_event, groupId: string) => {
    if (typeof groupId !== 'string' || !groupId) {
      throw new Error('groupId required')
    }
    return listGroupMembers(getDatabase(), groupId)
  })

  ipcMain.handle(
    CHAT_IPC.sendCode,
    (_event, groupId: string, code: string, languageHint?: string, theme?: 'light' | 'dark', options?: SendChatOptions) => {
      if (typeof groupId !== 'string' || !groupId) {
        throw new Error('groupId required')
      }
      return sendCodeMessage(getDatabase(), groupId, code, languageHint, theme, options)
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

  ipcMain.handle(CHAT_IPC.sendExistingFile, (_event, groupId: string, fileId: string) => {
    if (typeof groupId !== 'string' || !groupId) {
      throw new Error('groupId required')
    }
    if (typeof fileId !== 'string' || !fileId) {
      throw new Error('fileId required')
    }
    return sendExistingFileMessage(getDatabase(), groupId, fileId)
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

  ipcMain.handle(CHAT_IPC.recallMessage, (_event, groupId: string, msgId: string) => {
    if (typeof groupId !== 'string' || !groupId) {
      throw new Error('groupId required')
    }
    if (typeof msgId !== 'string' || !msgId) {
      throw new Error('msgId required')
    }
    return recallMessage(getDatabase(), groupId, msgId)
  })

  ipcMain.handle(CHAT_IPC.retryMessage, (_event, msgId: string) => {
    if (typeof msgId !== 'string' || !msgId) {
      throw new Error('msgId required')
    }
    return retryFailedMessage(getDatabase(), msgId)
  })

  ipcMain.handle(
    CHAT_IPC.editMessage,
    (_event, groupId: string, msgId: string, text: string) => {
      if (typeof groupId !== 'string' || !groupId) throw new Error('groupId required')
      if (typeof msgId !== 'string' || !msgId) throw new Error('msgId required')
      return editTextMessage(getDatabase(), groupId, msgId, text)
    }
  )

  ipcMain.handle(CHAT_IPC.listPinnedIds, (_event, groupId: string) => {
    if (typeof groupId !== 'string' || !groupId) throw new Error('groupId required')
    return listPinnedMessageIds(getDatabase(), groupId)
  })

  ipcMain.handle(CHAT_IPC.togglePin, (_event, groupId: string, msgId: string) => {
    if (typeof groupId !== 'string' || !groupId) throw new Error('groupId required')
    if (typeof msgId !== 'string' || !msgId) throw new Error('msgId required')
    return togglePinnedMessage(getDatabase(), groupId, msgId)
  })

  ipcMain.handle(
    CHAT_IPC.forwardMessage,
    (_event, sourceMsgId: string, targetGroupId: string, senderDisplayName?: string) => {
      if (typeof sourceMsgId !== 'string' || !sourceMsgId) throw new Error('sourceMsgId required')
      if (typeof targetGroupId !== 'string' || !targetGroupId) {
        throw new Error('targetGroupId required')
      }
      const db = getDatabase()
      const source = getMessageById(db, sourceMsgId)
      if (!source) throw new Error('message not found')
      return forwardMessageToGroup(db, source, targetGroupId, senderDisplayName)
    }
  )
}
