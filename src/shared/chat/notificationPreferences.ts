/** Renderer preference: notify for all new messages (not only @mentions). */
export const NOTIFY_ALL_MESSAGES_KEY = 'lanpm.chat.notifyAllMessages'

/** 任务到期桌面提醒（默认开启） */
export const NOTIFY_DUE_TASKS_KEY = 'lanpm.task.notifyDueTasks'

/** 已提醒去重：JSON string[] of `${taskId}:${ymd}` */
export const DUE_NOTIFIED_KEYS = 'lanpm.task.dueNotifiedKeys'

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

export function getNotifyDueTasks(): boolean {
  try {
    const v = localStorage.getItem(NOTIFY_DUE_TASKS_KEY)
    if (v === null) return true
    return v === 'true'
  } catch {
    return true
  }
}

export function setNotifyDueTasks(enabled: boolean): void {
  try {
    localStorage.setItem(NOTIFY_DUE_TASKS_KEY, enabled ? 'true' : 'false')
  } catch {
    /* ignore */
  }
}

export function getDueNotifiedKeys(): Set<string> {
  try {
    const raw = localStorage.getItem(DUE_NOTIFIED_KEYS)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((x): x is string => typeof x === 'string'))
  } catch {
    return new Set()
  }
}

export function markDueNotified(keys: ReadonlyArray<string>): void {
  try {
    const next = getDueNotifiedKeys()
    for (const k of keys) next.add(k)
    // 控制体积：只保留最近 200 条
    const arr = [...next]
    const trimmed = arr.length > 200 ? arr.slice(arr.length - 200) : arr
    localStorage.setItem(DUE_NOTIFIED_KEYS, JSON.stringify(trimmed))
  } catch {
    /* ignore */
  }
}
