import type { ChatMessage } from '../chat/types'
import { TASK_TITLE_MAX_LENGTH } from './validation.ts'

/** Derive a task title from a chat message for one-click create (A2). */
export function titleFromChatMessage(message: ChatMessage): string | null {
  const { content } = message
  if (content.kind === 'recalled' || content.kind === 'system' || content.kind === 'task_ref') {
    return null
  }
  let raw = ''
  if (content.kind === 'text') raw = content.text
  else if (content.kind === 'code') raw = content.code.split('\n')[0] ?? content.code
  else if (content.kind === 'file') raw = content.fileName
  const title = raw.replace(/\s+/g, ' ').trim()
  if (!title) return null
  return title.length > TASK_TITLE_MAX_LENGTH ? title.slice(0, TASK_TITLE_MAX_LENGTH) : title
}

/** File id to link when creating a task from a file message. */
export function linkedFileIdsFromMessage(message: ChatMessage): string[] | undefined {
  if (message.content.kind !== 'file') return undefined
  return [message.content.fileId]
}
