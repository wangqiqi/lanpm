import type { ChatForwardedFrom, ChatMessage, MessageContent } from './types'
import { extractMessageText } from '../search/extractMessageText'

export interface ForwardMessageInput {
  source: ChatMessage
  targetGroupId: string
  senderDisplayName?: string
}

/** Build text content for a forwarded message in the target group. */
export function buildForwardedTextContent(
  source: ChatMessage,
  forwardedFrom: ChatForwardedFrom
): { kind: 'text'; text: string; meta: { forwardedFrom: ChatForwardedFrom } } {
  const body = extractMessageText(source.content).trim()
  const prefix = forwardedFrom.senderDisplayName
    ? `[转发] ${forwardedFrom.senderDisplayName}: `
    : '[转发] '
  return {
    kind: 'text',
    text: `${prefix}${body || source.type}`,
    meta: { forwardedFrom }
  }
}

export function canForwardMessage(message: ChatMessage): boolean {
  const { content } = message
  return (
    content.kind === 'text' ||
    content.kind === 'code' ||
    content.kind === 'file' ||
    content.kind === 'voice' ||
    content.kind === 'task_ref'
  )
}

export function forwardedFromForMessage(
  source: ChatMessage,
  senderDisplayName?: string
): ChatForwardedFrom {
  return {
    groupId: source.groupId,
    senderUserId: source.senderUserId,
    senderDisplayName,
    msgId: source.msgId
  }
}

export function cloneContentForForward(content: MessageContent): MessageContent {
  if (content.kind === 'text') {
    return { kind: 'text', text: content.text, meta: content.meta }
  }
  if (content.kind === 'code') {
    return { kind: 'code', language: content.language, code: content.code, theme: content.theme }
  }
  if (content.kind === 'file') {
    return {
      kind: 'file',
      fileId: content.fileId,
      fileName: content.fileName,
      size: content.size
    }
  }
  if (content.kind === 'voice') {
    return {
      kind: 'voice',
      fileId: content.fileId,
      durationMs: content.durationMs,
      mimeType: content.mimeType
    }
  }
  if (content.kind === 'task_ref') {
    return { kind: 'task_ref', taskId: content.taskId, title: content.title }
  }
  return content
}
