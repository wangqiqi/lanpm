import { memo, useMemo } from 'react'
import type { ChatMessage } from '@shared/chat/types'
import { quotePreviewFromMessage } from '@shared/chat/replyQuote'
import { resolveMemberDisplayName } from '@renderer/i18n/memberDisplay'
import type { GroupMemberView } from '@shared/chat/members'
import { useI18n } from '@renderer/i18n/useI18n'
import { buildQuoteKindLabels } from '@renderer/features/chat/quoteKindLabels'
import styles from './chat.module.css'

interface PinnedMessagesBarProps {
  pinnedIds: string[]
  messageById: Map<string, ChatMessage>
  members: GroupMemberView[]
  onJump: (msgId: string) => void
  onUnpin: (msgId: string) => void
}

function PinnedMessagesBarInner({
  pinnedIds,
  messageById,
  members,
  onJump,
  onUnpin
}: PinnedMessagesBarProps): React.ReactElement | null {
  const { t } = useI18n()
  const kindLabels = useMemo(() => buildQuoteKindLabels(t), [t])
  if (pinnedIds.length === 0) return null

  return (
    <div className={styles.pinnedBar} role="region" aria-label={t('chat.pinnedMessages')}>
      {pinnedIds.map((msgId) => {
        const msg = messageById.get(msgId)
        const sender = msg ? members.find((m) => m.userId === msg.senderUserId) : undefined
        const senderName = msg
          ? resolveMemberDisplayName(sender?.displayName ?? msg.senderUserId, t)
          : ''
        const preview = msg
          ? msg.content.kind === 'recalled'
            ? t('chat.replyQuoteRecalled')
            : quotePreviewFromMessage(msg, kindLabels) || t('chat.replyQuoteEmpty')
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

export default memo(PinnedMessagesBarInner)
