import type { ResolvedReplyQuote } from '@shared/chat/replyQuote'
import { useI18n } from '@renderer/i18n/useI18n'
import styles from './chat.module.css'

interface MessageReplyStripProps {
  quote: ResolvedReplyQuote
  onJump?: (msgId: string) => void
}

export default function MessageReplyStrip({
  quote,
  onJump
}: MessageReplyStripProps): React.ReactElement {
  const { t } = useI18n()
  const preview =
    quote.state === 'recalled'
      ? t('chat.replyQuoteRecalled')
      : quote.state === 'missing'
        ? t('chat.replyQuoteMissing')
        : quote.preview || t('chat.replyQuoteEmpty')

  return (
    <button
      type="button"
      className={styles.messageReplyStrip}
      onClick={() => onJump?.(quote.msgId)}
      aria-label={t('chat.jumpToQuotedMessage')}
    >
      {quote.senderName ? (
        <span className={styles.messageReplyStripSender}>{quote.senderName}</span>
      ) : null}
      <span className={styles.messageReplyStripPreview}>{preview}</span>
    </button>
  )
}
