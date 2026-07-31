import type { ChatMessage } from '@shared/chat/types'
import { quotePreviewFromMessage } from '@shared/chat/replyQuote'
import { resolveMemberDisplayName } from '@renderer/i18n/memberDisplay'
import type { GroupMemberView } from '@shared/chat/members'
import { useI18n } from '@renderer/i18n/useI18n'
import styles from './chat.module.css'

interface PinnedMessagesBarProps {
  pinnedIds: string[]
  messages: ChatMessage[]
  members: GroupMemberView[]
  onJump: (msgId: string) => void
  onUnpin: (msgId: string) => void
}

export default function PinnedMessagesBar({
  pinnedIds,
  messages,
  members,
  onJump,
  onUnpin
}: PinnedMessagesBarProps): React.ReactElement | null {
  const { t } = useI18n()
  if (pinnedIds.length === 0) return null

  const byId = new Map(messages.map((m) => [m.msgId, m]))

  return (
    <div className={styles.pinnedBar} role="region" aria-label={t('chat.pinnedMessages')}>
      {pinnedIds.map((msgId) => {
        const msg = byId.get(msgId)
        const sender = msg ? members.find((m) => m.userId === msg.senderUserId) : undefined
        const senderName = msg
          ? resolveMemberDisplayName(sender?.displayName ?? msg.senderUserId, t)
          : ''
        const preview = msg
          ? msg.content.kind === 'recalled'
            ? t('chat.replyQuoteRecalled')
            : quotePreviewFromMessage(msg)
          : t('chat.replyQuoteMissing')
        return (
          <div key={msgId} className={styles.pinnedItem}>
            <button type="button" className={styles.pinnedItemBody} onClick={() => onJump(msgId)}>
              <span className={styles.pinnedItemSender}>{senderName}</span>
              <span className={styles.pinnedItemPreview}>{preview}</span>
            </button>
            <button
              type="button"
              className={styles.pinnedItemUnpin}
              aria-label={t('chat.unpinMessage')}
              onClick={() => onUnpin(msgId)}
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}
