import type { ChatMessage } from './types'

/** Initial / older-page size for chat history (TASK-133). */
export const CHAT_HISTORY_PAGE_SIZE = 200

export interface ChatMessagePage {
  messages: ChatMessage[]
  hasMore: boolean
}
