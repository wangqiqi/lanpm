import type { AppLocale } from '../locale/types'

export type MeetingReminderKind = '5min' | 'start'

const REMINDER_TITLES: Record<AppLocale, Record<MeetingReminderKind, string>> = {
  'zh-CN': {
    '5min': '会议将在 5 分钟后开始',
    start: '会议现在开始'
  },
  'en-US': {
    '5min': 'Meeting in 5 minutes',
    start: 'Meeting starting now'
  }
}

const REMINDER_BODY_TEMPLATE: Record<AppLocale, string> = {
  'zh-CN': '{title} · {when}',
  'en-US': '{title} · {when}'
}

export function meetingReminderTitle(kind: MeetingReminderKind, locale: AppLocale): string {
  return REMINDER_TITLES[locale]?.[kind] ?? REMINDER_TITLES['zh-CN'][kind]
}

export function meetingReminderBody(
  title: string,
  whenLabel: string,
  locale: AppLocale
): string {
  const template = REMINDER_BODY_TEMPLATE[locale] ?? REMINDER_BODY_TEMPLATE['zh-CN']
  return template.replace('{title}', title).replace('{when}', whenLabel)
}

export function formatMeetingReminderWhen(startsAt: string, locale: AppLocale): string {
  const when = new Date(startsAt)
  if (Number.isNaN(when.getTime())) return startsAt
  return when.toLocaleString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    day: 'numeric'
  })
}
