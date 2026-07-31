import { CloseOutlined } from '@ant-design/icons'
import type { ResolvedReplyQuote } from '@shared/chat/replyQuote'
import { useI18n } from '@renderer/i18n/useI18n'
import styles from './chat.module.css'

interface ReplyQuoteBarProps {
  quote: ResolvedReplyQuote
  onDismiss: () => void
}

export default function ReplyQuoteBar({ quote, onDismiss }: ReplyQuoteBarProps): React.ReactElement {
  const { t } = useI18n()
  const preview =
    quote.state === 'recalled'
      ? t('chat.replyQuoteRecalled')
      : quote.state === 'missing'
        ? t('chat.replyQuoteMissing')
        : quote.preview || t('chat.replyQuoteEmpty')

  return (
    <div className={styles.replyQuoteBar} role="region" aria-label={t('chat.replyQuoteBar')}>
      <div className={styles.replyQuoteBarBody}>
        <span className={styles.replyQuoteBarLabel}>{t('chat.replyingTo')}</span>
        {quote.senderName ? (
          <span className={styles.replyQuoteBarSender}>{quote.senderName}</span>
        ) : null}
        <span className={styles.replyQuoteBarPreview}>{preview}</span>
      </div>
      <button
        type="button"
        className={styles.replyQuoteBarClose}
        aria-label={t('chat.replyQuoteDismiss')}
        onClick={onDismiss}
      >
        <CloseOutlined />
      </button>
    </div>
  )
}
