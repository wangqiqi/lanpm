/** Renderer push channel for incoming chat messages */
export const CHAT_PUSH_CHANNEL = 'chat:message'

export const CHAT_IPC = {
  listMessages: 'chat:listMessages',
  sendText: 'chat:sendText',
  sendCode: 'chat:sendCode',
  listMembers: 'chat:listMembers',
  markRead: 'chat:markRead',
  sendFile: 'chat:sendFile',
  pickAndSendFile: 'chat:pickAndSendFile',
  captureAndSendScreenshot: 'chat:captureAndSendScreenshot'
} as const
