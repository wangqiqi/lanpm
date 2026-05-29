import { Button, Spin, Typography } from 'antd'
import { useI18n } from '@renderer/i18n/useI18n'
import styles from './ViewState.module.css'

const { Text } = Typography

export function ViewLoadingCenter(): React.ReactElement {
  const { t } = useI18n()
  return (
    <div className={styles.center}>
      <Spin tip={t('common.loading')} />
    </div>
  )
}

export function ViewEmptyHint({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div className={styles.center}>
      <Text type="secondary" className={styles.empty}>
        {children}
      </Text>
    </div>
  )
}

export function ViewErrorCenter({
  message,
  onRetry
}: {
  message: string
  onRetry?: () => void
}): React.ReactElement {
  const { t } = useI18n()
  return (
    <div className={styles.center}>
      <Text type="danger" className={styles.empty}>
        {message}
      </Text>
      {onRetry && (
        <Button type="primary" className={styles.retryBtn} onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  )
}
