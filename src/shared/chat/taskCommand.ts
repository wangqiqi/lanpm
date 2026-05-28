/** 解析 `/task` 或 `/task 标题` */
export function parseTaskCommand(text: string): { title: string } | null {
  const trimmed = text.trim()
  if (!trimmed.startsWith('/task')) return null
  const rest = trimmed.slice('/task'.length).trim()
  return { title: rest }
}

export function isTaskCommandDraft(text: string): boolean {
  return text.trimStart().startsWith('/task')
}
