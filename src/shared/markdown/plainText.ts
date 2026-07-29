/** 将常见 Markdown 转为可读纯文本（复制「纯文本」用） */
export function markdownToPlainText(source: string): string {
  let text = source
  text = text.replace(/```[\w-]*\n?([\s\S]*?)```/g, (_, code: string) => code.trim())
  text = text.replace(/^#{1,6}\s+/gm, '')
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1')
  text = text.replace(/\*([^*]+)\*/g, '$1')
  text = text.replace(/__([^_]+)__/g, '$1')
  text = text.replace(/_([^_]+)_/g, '$1')
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  text = text.replace(/`([^`]+)`/g, '$1')
  text = text.replace(/^\s*[-*+]\s+/gm, '• ')
  text = text.replace(/^\s*(\d+)\.\s+/gm, '$1. ')
  return text.trim()
}
