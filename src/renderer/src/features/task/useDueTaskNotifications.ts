import { useEffect, useRef } from 'react'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { useIdentityStore } from '@renderer/stores/identityStore'
import { useNotificationPrefsStore } from '@renderer/stores/notificationPrefsStore'
import { useI18n } from '@renderer/i18n/useI18n'
import {
  dueNotifyDedupeKey,
  localYmd,
  selectDueNudgeTasks
} from '@shared/task/dueNudge'
import {
  getDueNotifiedKeys,
  markDueNotified
} from '@shared/chat/notificationPreferences'

const SCAN_INTERVAL_MS = 5 * 60 * 1000
const MAX_NOTIFY_PER_SCAN = 3

function showDesktopNotification(title: string, body: string): void {
  if (typeof Notification === 'undefined') return
  const fire = (): void => {
    new Notification(title, { body })
  }
  if (Notification.permission === 'granted') {
    fire()
  } else if (Notification.permission !== 'denied') {
    void Notification.requestPermission().then((p) => {
      if (p === 'granted') fire()
    })
  }
}

/** A1 — 扫描本机相关未完成任务的今日/逾期截止，桌面提醒（去重）。 */
export function useDueTaskNotifications(): void {
  const { t } = useI18n()
  const userId = useIdentityStore((s) => s.user?.userId)
  const notifyDue = useNotificationPrefsStore((s) => s.notifyDueTasks)
  const hydratePrefs = useNotificationPrefsStore((s) => s.hydrate)
  const scanning = useRef(false)

  useEffect(() => {
    hydratePrefs()
  }, [hydratePrefs])

  useEffect(() => {
    if (!userId || !notifyDue) return

    const scan = async (): Promise<void> => {
      if (scanning.current) return
      scanning.current = true
      try {
        const groups = await getLanpmApi().group.list()
        const today = localYmd()
        const notified = getDueNotifiedKeys()
        const pendingKeys: string[] = []
        let fired = 0

        for (const g of groups) {
          if (fired >= MAX_NOTIFY_PER_SCAN) break
          const tasks = await getLanpmApi().task.listTasks(g.groupId)
          const due = selectDueNudgeTasks(tasks, userId, today)
          for (const item of due) {
            if (fired >= MAX_NOTIFY_PER_SCAN) break
            const key = dueNotifyDedupeKey(item.taskId, today)
            if (notified.has(key) || pendingKeys.includes(key)) continue
            pendingKeys.push(key)
            const title =
              item.kind === 'overdue'
                ? t('task.dueNotifyOverdueTitle')
                : t('task.dueNotifyTodayTitle')
            showDesktopNotification(title, item.title.slice(0, 200))
            fired += 1
          }
        }

        if (pendingKeys.length > 0) markDueNotified(pendingKeys)
      } catch {
        /* 静默：网络/身份未就绪时跳过 */
      } finally {
        scanning.current = false
      }
    }

    void scan()
    const timer = window.setInterval(() => void scan(), SCAN_INTERVAL_MS)
    const onFocus = (): void => {
      void scan()
    }
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
    }
  }, [userId, notifyDue, t])
}
