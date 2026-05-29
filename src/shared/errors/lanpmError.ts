/**
 * 主进程 / 共享层用户可见错误：Error.message 承载 i18n key（如 stub.identityRequired）。
 * Renderer 用 formatAppError 按当前 locale 翻译。
 */
export function isLanpmErrorCode(message: string): boolean {
  const m = message.trim()
  if (!m || m.includes(' ')) return false
  return /^(stub|err|board|setup|files|chat|group|data|member|gantt)\.[a-zA-Z][\w.]*$/.test(m)
}

export function throwLanpm(code: string): never {
  throw new Error(code)
}
