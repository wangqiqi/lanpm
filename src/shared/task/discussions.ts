import type { ChatMessage } from '../chat/types'

export type TaskDiscussionKind = 'task_ref' | 'source'

export interface TaskDiscussionItem {
  message: ChatMessage
  kind: TaskDiscussionKind
}

function isTaskRefFor(message: ChatMessage, taskId: string): boolean {
  return message.content.kind === 'task_ref' && message.content.taskId === taskId
}

/**
 * Collect discussion messages for a task: source message + task_ref bubbles.
 * Dedupes by msgId (source wins); sorts by lamportTs ASC then createdAt.
 */
export function collectTaskDiscussions(
  messages: ChatMessage[],
  taskId: string,
  sourceMsgId?: string
): TaskDiscussionItem[] {
  const byId = new Map<string, TaskDiscussionItem>()

  for (const message of messages) {
    if (message.content.kind === 'recalled') continue
    if (isTaskRefFor(message, taskId)) {
      byId.set(message.msgId, { message, kind: 'task_ref' })
    }
  }

  if (sourceMsgId) {
    const source = messages.find(
      (m) => m.msgId === sourceMsgId && m.content.kind !== 'recalled'
    )
    if (source) {
      byId.set(source.msgId, { message: source, kind: 'source' })
    }
  }

  return [...byId.values()].sort((a, b) => {
    if (a.message.lamportTs !== b.message.lamportTs) {
      return a.message.lamportTs - b.message.lamportTs
    }
    return a.message.createdAt.localeCompare(b.message.createdAt)
  })
}
