import type { MessageContent } from '../chat/types'

/** 从消息内容提取可搜索纯文本 */
export function extractMessageText(content: MessageContent): string {
  switch (content.kind) {
    case 'text':
      return content.text
    case 'code':
      return content.code
    case 'task_ref':
      return content.title
    case 'file':
      return content.fileName
    case 'system':
      return content.event
    case 'recalled':
      return ''
    default:
      return ''
  }
}
