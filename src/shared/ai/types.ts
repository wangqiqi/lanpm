export type AiMessageRole = 'user' | 'assistant' | 'system'

/** 助手打开入口（隐式上下文） */
export type AiEntrySource = 'topbar' | 'cockpit' | 'task-detail' | 'global'

export interface AiThreadContext {
  /** Cockpit report seed or task review seed */
  seedMarkdown?: string
  taskId?: string
  reportKind?: 'weekly' | 'monthly' | 'evaluate' | 'patrol' | 'healthCheck' | 'taskRemediate'
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
  /** 打开助手时的入口（隐式注入 system） */
  entrySource?: AiEntrySource
  /** 当前路由视图，如 board / chat / cockpit */
  appView?: string | null
  /** UI 语言，如 zh-CN */
  locale?: string
  /** 客户端在线状态 */
  networkOnline?: boolean
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
  /** null when no key or not yet probed */
  endpointReachable: boolean | null
  endpointCheckedAt: string | null
  canStream: boolean
}
