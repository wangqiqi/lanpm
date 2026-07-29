/** 启发式判断文本是否应按 Markdown 渲染（群聊 · AI 转发等） */

const MARKDOWN_SIGNAL =
  /(\*\*[^*]+\*\*|__[^_]+__|_[^_]+_|`[^`]+`|```[\s\S]*?```|^#{1,6}\s+\S|^\s*[-*+]\s+\S|^\s*\d+\.\s+\S|\[[^\]]+\]\([^)]+\))/m

export function looksLikeMarkdown(text: string): boolean {
  return MARKDOWN_SIGNAL.test(text)
}

export function shouldRenderChatMarkdown(
  text: string,
  meta?: { source?: string }
): boolean {
  if (meta?.source === 'ai-assistant') return true
  return looksLikeMarkdown(text)
}
