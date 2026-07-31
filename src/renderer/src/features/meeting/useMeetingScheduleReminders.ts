import { useEffect, useRef } from 'react'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { showDesktopNotification } from '@renderer/platform/desktopNotification'
import { useI18n } from '@renderer/i18n/useI18n'
import { scanMeetingReminders } from '@shared/media/meetingReminderLogic'

const SCAN_INTERVAL_MS = 30_000

/** 浏览器开发桩：本机日程提醒（Electron 由主进程 `meetingReminderService` 负责）。 */
export function useMeetingScheduleReminders(): void {
  const { t } = useI18n()
  const notifiedRef = useRef(new Set<string>())
  const scanning = useRef(false)

  useEffect(() => {
    let api: ReturnType<typeof getLanpmApi>
    try {
      api = getLanpmApi()
    } catch {
      return
    }
    if (api.platform !== 'browser') return

    const scan = async (): Promise<void> => {
      if (scanning.current) return
      scanning.current = true
      try {
        const schedules = await api.meeting.listSchedules()
        const hits = scanMeetingReminders(schedules, Date.now(), notifiedRef.current)
        for (const hit of hits) {
          notifiedRef.current.add(hit.dedupeKey)
          const title =
            hit.kind === '5min'
              ? t('plugin.meetingReminder5minTitle')
              : t('plugin.meetingReminderStartTitle')
          const when = new Date(hit.schedule.startsAt)
          const whenLabel = Number.isNaN(when.getTime())
            ? hit.schedule.startsAt
            : when.toLocaleString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
                month: 'short',
                day: 'numeric'
              })
          showDesktopNotification(
            title,
            t('plugin.meetingReminderBody', { title: hit.schedule.title, when: whenLabel })
          )
        }
      } catch {
        /* 静默 */
      } finally {
        scanning.current = false
      }
    }

    void scan()
    const timer = window.setInterval(() => void scan(), SCAN_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [t])
}
