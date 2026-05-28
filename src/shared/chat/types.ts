/** docs/04 §3.3 — chat message types */

export type MessageType = 'text' | 'code' | 'file' | 'task_ref' | 'system'

export type MessageDeliveryStatus = 'sending' | 'sent' | 'read'

export type MessageContent =
  | { kind: 'text'; text: string }
  | { kind: 'code'; language: string; code: string; theme?: 'light' | 'dark' }
  | { kind: 'file'; fileId: string; fileName: string; size: number }
  | { kind: 'task_ref'; taskId: string; title: string }
  | { kind: 'system'; event: string; payload?: Record<string, unknown> }

export interface ChatMessage {
  msgId: string
  groupId: string
  senderUserId: string
  senderDeviceId: string
  type: MessageType
  content: MessageContent
  lamportTs: number
  createdAt: string
  replyToMsgId?: string
  mentions?: string[]
  deliveryStatus: MessageDeliveryStatus
}

/** docs/04 §6.2 */
export interface ChatPayload {
  message: ChatMessage
}

export interface SendTextInput {
  groupId: string
  text: string
}

export interface SendCodeInput {
  groupId: string
  code: string
  languageHint?: string
  theme?: 'light' | 'dark'
}
