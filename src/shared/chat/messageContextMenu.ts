import type { ChatMessage } from './types'
import { canRecallMessage } from './recall'

export type MessageContextMenuActionId =
  | 'copy'
  | 'copyCode'
  | 'openTask'
  | 'openFile'
  | 'createTask'
  | 'linkExistingTask'
  | 'linkFile'
  | 'mention'
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
  /** Other-party bubble — show @mention in bubble menu */
  showMention?: boolean
}

/**
 * Flat core menu action ids in display order:
 * copy → task/nav → mention → recall (own only, bottom).
 * Plugin items append after core actions without dividers (host wiring).
 */
export function buildMessageContextMenuActions(
  input: BuildMessageContextMenuInput
): MessageContextMenuAction[] {
  const { message, own, currentUserId, taskCreateAllowed, showMention } = input
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

  if (taskCreateAllowed && isTaskCreatable(message)) {
    actions.push({ id: 'createTask' })
    if (message.content.kind === 'text' || message.content.kind === 'code') {
      actions.push({ id: 'linkExistingTask' })
    }
    if (message.content.kind === 'file') {
      actions.push({ id: 'linkFile' })
    }
  }

  if (!own && showMention) {
    actions.push({ id: 'mention' })
  }

  if (own && currentUserId && canRecallMessage(message, currentUserId)) {
    actions.push({ id: 'recall' })
  }

  return actions
}
