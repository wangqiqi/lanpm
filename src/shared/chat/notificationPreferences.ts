/** Renderer preference: notify for all new messages (not only @mentions). */
export const NOTIFY_ALL_MESSAGES_KEY = 'lanpm.chat.notifyAllMessages'

export function getNotifyAllMessages(): boolean {
  try {
    return localStorage.getItem(NOTIFY_ALL_MESSAGES_KEY) === 'true'
  } catch {
    return false
  }
}

export function setNotifyAllMessages(enabled: boolean): void {
  try {
    localStorage.setItem(NOTIFY_ALL_MESSAGES_KEY, enabled ? 'true' : 'false')
  } catch {
    /* ignore quota / private mode */
  }
}
