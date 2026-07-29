/** 与 ChatView.formatTime 一致：当日消息显示 HH:mm */
export function formatAiMessageTime(iso: string): string {
  try {
    const d = new Date(iso)
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch {
    return ''
  }
}
