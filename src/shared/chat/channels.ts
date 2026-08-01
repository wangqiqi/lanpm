/** Renderer push channel for incoming chat messages */
export const CHAT_PUSH_CHANNEL = 'chat:message'

export const CHAT_IPC = {
  listMessages: 'chat:listMessages',
  loadOlderMessages: 'chat:loadOlderMessages',
  sendText: 'chat:sendText',
  sendCode: 'chat:sendCode',
  listMembers: 'chat:listMembers',
  markRead: 'chat:markRead',
  sendFile: 'chat:sendFile',
  sendExistingFile: 'chat:sendExistingFile',
  pickAndSendFile: 'chat:pickAndSendFile',
  captureAndSendScreenshot: 'chat:captureAndSendScreenshot',
  sendVoice: 'chat:sendVoice',
  recallMessage: 'chat:recallMessage',
  sendTaskRef: 'chat:sendTaskRef',
  retryMessage: 'chat:retryMessage',
  editMessage: 'chat:editMessage',
  listPinnedIds: 'chat:listPinnedIds',
  togglePin: 'chat:togglePin',
  forwardMessage: 'chat:forwardMessage',
  listDmPreviews: 'chat:listDmPreviews'
} as const

export interface SendChatOptions {
  replyToMsgId?: string
}

/** Optional task link when sending a file to group chat (ops inbound + task detail). */
export interface SendFileOptions {
  linkTaskId?: string
}
