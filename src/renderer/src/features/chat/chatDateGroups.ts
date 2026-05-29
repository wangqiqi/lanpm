import type { ChatMessage } from '@shared/chat/types'
import type { LocaleId } from '@renderer/i18n/types'
import { translate } from '@renderer/i18n/messages'
import type { MessageKey } from '@renderer/i18n/messages'

export interface ChatDayGroup {
  dayKey: string
  label: string
  messages: ChatMessage[]
}

function dayKey(iso: string): string {
  return iso.slice(0, 10)
}

function formatDayLabel(iso: string, locale: LocaleId): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  const key = dayKey(iso)
  if (key === dayKey(today.toISOString())) return translate(locale, 'chat.dayToday')
  if (key === dayKey(yesterday.toISOString())) return translate(locale, 'chat.dayYesterday')
  try {
    return d.toLocaleDateString(locale === 'en-US' ? 'en-US' : 'zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return key
  }
}

export function groupMessagesByDay(messages: ChatMessage[], locale: LocaleId): ChatDayGroup[] {
  const groups: ChatDayGroup[] = []
  for (const msg of messages) {
    const key = dayKey(msg.createdAt)
    const last = groups[groups.length - 1]
    if (!last || last.dayKey !== key) {
      groups.push({ dayKey: key, label: formatDayLabel(msg.createdAt, locale), messages: [msg] })
    } else {
      last.messages.push(msg)
    }
  }
  return groups
}

export function deliveryStatusMeta(
  status: 'sending' | 'sent' | 'read',
  t: (key: MessageKey) => string
): { text: string; ariaLabel: string } {
  if (status === 'sending') {
    return { text: '…', ariaLabel: t('chat.deliverySending') }
  }
  if (status === 'sent') {
    return { text: '✓', ariaLabel: t('chat.deliverySent') }
  }
  return { text: '✓✓', ariaLabel: t('chat.deliveryRead') }
}
