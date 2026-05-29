import type { SYNC_WINDOW_DAYS } from './retention'

export interface DataStorageSettingsView {
  localRetentionDays: number
  syncWindowDays: typeof SYNC_WINDOW_DAYS
  messageCount: number
}

export interface DataCleanupOptions {
  chat?: boolean
  files?: boolean
  transfers?: boolean
  taskTrash?: boolean
}

export interface DataCleanupResult {
  messagesDeleted: number
  receiptsDeleted: number
  transfersDeleted: number
  tasksDeleted: number
}

export type ClearGroupMessagesMode = 'older_than_retention' | 'all_local'
