import type { ChatMessage } from './types'
import { canRecallMessage } from './recall'
import { canForwardMessage } from './forwardMessage'
import { canEditMessage } from './messageEdit'

export type MessageContextMenuActionId =
  | 'copy'
  | 'copyCode'
  | 'openTask'
  | 'openFile'
  | 'reply'
  | 'forward'
  | 'createTask'
  | 'linkExistingTask'
  | 'edit'
  | 'enterMultiSelect'
  | 'recall'

export interface MessageContextMenuAction {
  id: MessageContextMenuActionId
}

export type MessageCopyKind = 'text' | 'code' | 'fileMeta' | 'taskRef'

export interface MessageCopyPayload {
  kind: MessageCopyKind
  text: string
}

const NON_TASK_KINDS = new Set<ChatMessage['content']['kind']>([
  'recalled',
  'system',
  'task_ref'
])

function isTaskCreatable(message: ChatMessage): boolean {
  return !NON_TASK_KINDS.has(message.content.kind)
}

/** Clipboard text for the primary「复制」item. */
export function getMessageCopyPayload(message: ChatMessage): MessageCopyPayload | null {
  const { content } = message
  if (content.kind === 'recalled' || content.kind === 'system') return null
  if (content.kind === 'text') {
    const text = content.text.trim()
    return text ? { kind: 'text', text: content.text } : null
  }
  if (content.kind === 'code') {
    return content.code ? { kind: 'code', text: content.code } : null
  }
  if (content.kind === 'file') {
    return { kind: 'fileMeta', text: content.fileName }
  }
  if (content.kind === 'task_ref') {
    return { kind: 'taskRef', text: content.title }
  }
  return null
}

/** Secondary「复制代码」— code messages only. */
export function getMessageCopyCodeText(message: ChatMessage): string | null {
  if (message.content.kind !== 'code' || !message.content.code) return null
  return message.content.code
}

export interface BuildMessageContextMenuInput {
  message: ChatMessage
  own: boolean
  currentUserId?: string
  taskCreateAllowed: boolean
  multiSelectActive?: boolean
}

function isInteractive(message: ChatMessage): boolean {
  return message.content.kind !== 'recalled' && message.content.kind !== 'system'
}

/**
 * Flat core menu action ids in display order:
 * copy → nav → quote/forward → task → edit/multi → recall (own only, bottom).
 * @mention 仅在头像/昵称右键菜单（sender menu），避免与气泡菜单重复。
 * 群置顶不在气泡上下文提供（顶栏区仍可查看/取消已有置顶）。
 * Plugin items append after core actions without dividers (host wiring).
 */
export function buildMessageContextMenuActions(
  input: BuildMessageContextMenuInput
): MessageContextMenuAction[] {
  const { message, own, currentUserId, taskCreateAllowed, multiSelectActive } = input
  if (multiSelectActive) return []
  const actions: MessageContextMenuAction[] = []

  if (getMessageCopyPayload(message)) {
    actions.push({ id: 'copy' })
  }
  if (getMessageCopyCodeText(message)) {
    actions.push({ id: 'copyCode' })
  }

  if (message.content.kind === 'task_ref') {
    actions.push({ id: 'openTask' })
  }
  if (message.content.kind === 'file') {
    actions.push({ id: 'openFile' })
  }

  if (isInteractive(message)) {
    actions.push({ id: 'reply' })
  }
  if (canForwardMessage(message)) {
    actions.push({ id: 'forward' })
  }

  if (taskCreateAllowed && isTaskCreatable(message)) {
    actions.push({ id: 'createTask' })
    if (message.content.kind === 'text' || message.content.kind === 'code') {
      actions.push({ id: 'linkExistingTask' })
    }
  }

  if (own && currentUserId && canEditMessage(message, currentUserId)) {
    actions.push({ id: 'edit' })
  }

  if (isInteractive(message)) {
    actions.push({ id: 'enterMultiSelect' })
  }

  if (own && currentUserId && canRecallMessage(message, currentUserId)) {
    actions.push({ id: 'recall' })
  }

  return actions
}
