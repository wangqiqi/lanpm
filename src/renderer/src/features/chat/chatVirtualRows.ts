import type { ChatMessage } from '@shared/chat/types'
import type { ChatDayGroup } from '@renderer/features/chat/chatDateGroups'

export type ChatVirtualRow =
  | { kind: 'loadOlder' }
  | { kind: 'day'; dayKey: string; label: string }
  | { kind: 'message'; message: ChatMessage; showSender: boolean }

export function buildChatVirtualRows(
  dayGroups: ChatDayGroup[],
  showLoadOlder: boolean
): ChatVirtualRow[] {
  const rows: ChatVirtualRow[] = []
  if (showLoadOlder) rows.push({ kind: 'loadOlder' })
  for (const group of dayGroups) {
    rows.push({ kind: 'day', dayKey: group.dayKey, label: group.label })
    for (let i = 0; i < group.messages.length; i++) {
      const msg = group.messages[i]!
      const prev = i > 0 ? group.messages[i - 1]! : null
      const showSender =
        !prev ||
        prev.senderUserId !== msg.senderUserId ||
        msg.createdAt.slice(0, 16) !== prev.createdAt.slice(0, 16)
      rows.push({ kind: 'message', message: msg, showSender })
    }
  }
  return rows
}

export function virtualRowKey(row: ChatVirtualRow, index: number): string {
  if (row.kind === 'loadOlder') return 'load-older'
  if (row.kind === 'day') return `day:${row.dayKey}`
  return `msg:${row.message.msgId}`
}

export function estimateVirtualRowSize(row: ChatVirtualRow): number {
  if (row.kind === 'loadOlder') return 32
  if (row.kind === 'day') return 36
  return row.showSender ? 88 : 64
}
