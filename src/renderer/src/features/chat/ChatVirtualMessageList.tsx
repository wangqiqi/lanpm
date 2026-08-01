import { useVirtualizer } from '@tanstack/react-virtual'
import type { RefObject } from 'react'
import type { ChatMessage } from '@shared/chat/types'
import {
  buildChatVirtualRows,
  estimateVirtualRowSize,
  virtualRowKey,
  type ChatVirtualRow
} from '@renderer/features/chat/chatVirtualRows'
import type { ChatDayGroup } from '@renderer/features/chat/chatDateGroups'
import {
  MessageContentDeferProvider,
  shouldDeferHeavyContentForRow
} from '@renderer/features/chat/messageContentDefer'
import { useI18n } from '@renderer/i18n/useI18n'
import styles from './chat.module.css'

export interface ChatVirtualMessageListProps {
  listRef: RefObject<HTMLDivElement | null>
  dayGroups: ChatDayGroup[]
  showLoadOlder: boolean
  loadingOlder: boolean
  renderMessage: (message: ChatMessage, showSender: boolean) => React.ReactNode
}

export default function ChatVirtualMessageList({
  listRef,
  dayGroups,
  showLoadOlder,
  loadingOlder,
  renderMessage
}: ChatVirtualMessageListProps): React.ReactElement {
  const { t } = useI18n()
  const rows = buildChatVirtualRows(dayGroups, showLoadOlder)

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => listRef.current,
    estimateSize: (index) => estimateVirtualRowSize(rows[index]!),
    overscan: 8,
    getItemKey: (index) => virtualRowKey(rows[index]!, index)
  })

  const scrollOffset = virtualizer.scrollOffset
  const viewportHeight = virtualizer.scrollElement?.clientHeight ?? 0

  return (
    <div
      className={styles.messageList}
      style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}
    >
      {virtualizer.getVirtualItems().map((virtualRow) => {
        const row = rows[virtualRow.index] as ChatVirtualRow
        const deferHeavyContent = shouldDeferHeavyContentForRow(
          virtualRow.start,
          virtualRow.size ?? estimateVirtualRowSize(row),
          scrollOffset ?? 0,
          viewportHeight
        )
        return (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`
            }}
          >
            {row.kind === 'loadOlder' ? (
              <div className={styles.loadOlder}>
                {loadingOlder ? t('chat.loadingOlder') : t('chat.loadOlderHint')}
              </div>
            ) : row.kind === 'day' ? (
              <div className={styles.dayGroup}>
                <div className={styles.dayLabel}>{row.label}</div>
              </div>
            ) : (
              <MessageContentDeferProvider deferHeavyContent={deferHeavyContent}>
                {renderMessage(row.message, row.showSender)}
              </MessageContentDeferProvider>
            )}
          </div>
        )
      })}
    </div>
  )
}
