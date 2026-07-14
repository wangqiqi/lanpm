import { Button, Spin, Typography } from 'antd'
import { useI18n } from '@renderer/i18n/useI18n'
import styles from './ViewState.module.css'

const { Text } = Typography

export function ViewEmptyIcon({ icon }: { icon: React.ReactNode }): React.ReactElement {
  return (
    <div className={styles.iconRing} aria-hidden>
      <span className={styles.iconGlyph}>{icon}</span>
    </div>
  )
}

export function ViewLoadingCenter(): React.ReactElement {
  const { t } = useI18n()
  return (
    <div className={styles.center} role="status" aria-live="polite">
      <div className={styles.iconRing}>
        <Spin />
      </div>
      <Text type="secondary" className={styles.loadingHint}>
        {t('common.loading')}
      </Text>
    </div>
  )
}

export function ViewEmptyHint({
  children,
  icon,
  className
}: {
  children: React.ReactNode
  icon?: React.ReactNode
  className?: string
}): React.ReactElement {
  return (
    <div className={`${styles.center} ${className ?? ''}`.trim()} role="status">
      {icon ? <ViewEmptyIcon icon={icon} /> : null}
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
    <div className={styles.center} role="alert">
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
