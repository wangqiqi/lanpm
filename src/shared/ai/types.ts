export type AiMessageRole = 'user' | 'assistant' | 'system'

export interface AiThreadContext {
  /** Cockpit report seed or task review seed */
  seedMarkdown?: string
  taskId?: string
  reportKind?: 'weekly' | 'monthly' | 'evaluate'
}

export interface AiThread {
  threadId: string
  userId: string
  groupId: string | null
  title: string
  context: AiThreadContext | null
  createdAt: string
  updatedAt: string
}

export interface AiMessage {
  messageId: string
  threadId: string
  role: AiMessageRole
  content: string
  createdAt: string
}

export interface CreateAiThreadInput {
  groupId?: string | null
  title?: string
  context?: AiThreadContext | null
}

export interface ListAiThreadsInput {
  groupId?: string | null
}

export interface AppendAiMessageInput {
  threadId: string
  role: AiMessageRole
  content: string
}

export interface AiStreamChatInput {
  threadId?: string
  groupId?: string | null
  userMessage: string
  /** Resolved task IDs from # refs in composer */
  taskIds?: string[]
  createThreadTitle?: string
  context?: AiThreadContext | null
}

export interface AiStructuredReviewInput {
  groupId: string
  taskId: string
}

export interface AiStructuredReviewResult {
  summary: string
  risks: string[]
  suggestions: string[]
  usedExternalAi: boolean
}

export interface AiShareToChatInput {
  groupId: string
  markdown: string
  threadId?: string
}

export interface AiGateStatus {
  enabled: boolean
  hasApiKey: boolean
  canStream: boolean
}
