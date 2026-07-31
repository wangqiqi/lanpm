import type { ChatMessagePage } from '../chat/pagination'
import type { GroupMemberView } from '../chat/members'
import type { ChatMessage } from '../chat/types'
import type { ChecklistView } from '../task/checklist'

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

export type PluginCapabilityArgsMap = {
  'chat.listMessages': ChatListMessagesArgs
  'task.getChecklist': TaskGetChecklistArgs
  'member.list': MemberListArgs
  'chat.sendTaskRef': ChatSendTaskRefArgs
}

export type PluginCapabilityResultMap = {
  'chat.listMessages': ChatMessagePage
  'task.getChecklist': ChecklistView
  'member.list': GroupMemberView[]
  'chat.sendTaskRef': ChatMessage
}

export type ExtensionApiV02CapabilityId = keyof PluginCapabilityArgsMap
