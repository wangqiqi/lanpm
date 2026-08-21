import { Typography } from 'antd'
import { useI18n } from '@renderer/i18n/useI18n'
import styles from './OfficeLightPreview.module.css'

const { Text } = Typography

export default function OfficeLightPreview({
  url,
  title
}: {
  url: string
  title: string
}): React.ReactElement {
  const { t } = useI18n()
  return (
    <div className={styles.wrap} data-testid="office-light-preview">
      <Text type="secondary" className={styles.hint}>
        {t('files.officeLightPreviewHint')}
      </Text>
      <iframe
        className={styles.frame}
        src={url}
        title={title}
        sandbox=""
        referrerPolicy="no-referrer"
      />
    </div>
  )
}
