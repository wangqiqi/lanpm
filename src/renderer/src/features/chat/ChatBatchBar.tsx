import { Button } from 'antd'
import { useI18n } from '@renderer/i18n/useI18n'
import styles from './chat.module.css'

interface ChatBatchBarProps {
  selectedCount: number
  maxCount: number
  onCopy: () => void
  onForward: () => void
  onCancel: () => void
}

export default function ChatBatchBar({
  selectedCount,
  maxCount,
  onCopy,
  onForward,
  onCancel
}: ChatBatchBarProps): React.ReactElement {
  const { t } = useI18n()
  return (
    <div className={styles.batchBar} role="toolbar" aria-label={t('chat.batchBar')}>
      <span className={styles.batchBarCount}>
        {t('chat.batchSelected', { count: selectedCount, max: maxCount })}
      </span>
      <div className={styles.batchBarActions}>
        <Button size="small" onClick={onCopy} disabled={selectedCount === 0}>
          {t('chat.batchCopy')}
        </Button>
        <Button size="small" onClick={onForward} disabled={selectedCount === 0}>
          {t('chat.batchForward')}
        </Button>
        <Button size="small" type="text" onClick={onCancel}>
          {t('chat.batchCancel')}
        </Button>
      </div>
    </div>
  )
}
