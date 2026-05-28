/** Renderer push channel for incoming chat messages */
export const CHAT_PUSH_CHANNEL = 'chat:message'

export const CHAT_IPC = {
  listMessages: 'chat:listMessages',
  sendText: 'chat:sendText',
  sendCode: 'chat:sendCode'
} as const
