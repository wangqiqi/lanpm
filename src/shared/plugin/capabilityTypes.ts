import type { FileMeta } from '../file/types'
import type { ChatMessagePage } from '../chat/pagination'
import type { GroupMemberView } from '../chat/members'
import type { ChatMessage } from '../chat/types'
import type { AiMessage, AiThread } from '../ai/types'
import type { ChecklistView } from '../task/checklist'
import type { Task, TaskStatus } from '../task/types'
import type { TaskPatchWhitelistField } from './taskPatchWhitelist'

/** Extension API v0.2 — chat / board read + controlled write */

export type ChatListMessagesArgs = {
  groupId: string
  /** 省略则返回最近一页；提供则加载更早消息 */
  beforeLamportTs?: number
}

export type TaskGetChecklistArgs = {
  groupId: string
  taskId: string
}

export type MemberListArgs = {
  groupId: string
}

export type ChatSendTaskRefArgs = {
  groupId: string
  taskId: string
}

/** Extension API v0.5 — chat.sendText */
export type ChatSendTextArgs = {
  groupId: string
  text: string
  replyToMsgId?: string
}

/** Extension API v0.5 — file.upload */
export type FileUploadArgs = {
  groupId: string
  sourcePath: string
}

/** Extension API v0.6 — chat.sendMarkdown */
export type ChatSendMarkdownArgs = {
  groupId: string
  markdown: string
  replyToMsgId?: string
}

/** Extension API v0.6 — ai.getThread */
export type AiGetThreadArgs = {
  threadId: string
}

/** Extension API v0.6 — ai.streamChat (plugin subset) */
export type AiStreamChatCapabilityArgs = {
  userMessage: string
  threadId?: string
  groupId?: string | null
  taskIds?: string[]
  createThreadTitle?: string
}

/** Extension API v0.3 — task.patch payload */
export type TaskPatchPayload = Partial<
  Pick<Task, TaskPatchWhitelistField>
>

export type TaskPatchArgs = {
  groupId: string
  taskId: string
  patch: TaskPatchPayload
}

export type BoardMoveTaskArgs = {
  groupId: string
  taskId: string
  status: TaskStatus
  sortOrder?: number
  otherReason?: string
}

/** Extension API v0.4 — task.create (whitelist subset) */
export type TaskCreateArgs = {
  groupId: string
  title: string
  status?: TaskStatus
  priority?: Task['priority']
  tags?: string[]
}

export type PluginCapabilityArgsMap = {
  'chat.listMessages': ChatListMessagesArgs
  'task.getChecklist': TaskGetChecklistArgs
  'member.list': MemberListArgs
  'chat.sendTaskRef': ChatSendTaskRefArgs
  'chat.sendText': ChatSendTextArgs
  'chat.sendMarkdown': ChatSendMarkdownArgs
  'ai.getThread': AiGetThreadArgs
  'ai.streamChat': AiStreamChatCapabilityArgs
  'file.upload': FileUploadArgs
  'task.create': TaskCreateArgs
  'task.patch': TaskPatchArgs
  'board.moveTask': BoardMoveTaskArgs
}

export type PluginCapabilityResultMap = {
  'chat.listMessages': ChatMessagePage
  'task.getChecklist': ChecklistView
  'member.list': GroupMemberView[]
  'chat.sendTaskRef': ChatMessage
  'chat.sendText': ChatMessage
  'chat.sendMarkdown': ChatMessage
  'ai.getThread': { thread: AiThread; messages: AiMessage[] }
  'ai.streamChat': { requestId: string }
  'file.upload': FileMeta
  'task.create': Task
  'task.patch': Task
  'board.moveTask': Task
}

export type ExtensionApiV02CapabilityId = keyof Pick<
  PluginCapabilityArgsMap,
  'chat.listMessages' | 'task.getChecklist' | 'member.list' | 'chat.sendTaskRef'
>

export type ExtensionApiV03CapabilityId = keyof Pick<
  PluginCapabilityArgsMap,
  'task.patch' | 'board.moveTask'
>

export type ExtensionApiV04CapabilityId = keyof Pick<
  PluginCapabilityArgsMap,
  'task.create' | 'task.patch' | 'board.moveTask'
>

export type ExtensionApiV05CapabilityId = keyof Pick<
  PluginCapabilityArgsMap,
  'chat.sendText' | 'file.upload'
>

export type ExtensionApiV06CapabilityId = keyof Pick<
  PluginCapabilityArgsMap,
  'chat.sendMarkdown' | 'ai.getThread' | 'ai.streamChat'
>
