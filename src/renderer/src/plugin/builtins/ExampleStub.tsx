import { Typography } from 'antd'
import type { PluginView } from '@shared/plugin/types'
import { useI18n } from '@renderer/i18n/useI18n'
import styles from '../plugin.module.css'

const { Text } = Typography

interface Props {
  plugin: PluginView
  groupId: string
  taskId: string
}

/** 免费官方 stub — 证明 Host→Slot 端到端 */
export default function ExampleStub({ plugin, taskId }: Props): React.ReactElement {
  const { t } = useI18n()
  return (
    <div className={styles.card} data-plugin-id={plugin.id}>
      <div className={styles.cardHeader}>
        <Text strong>{plugin.name}</Text>
        <span className={styles.badge}>{t('plugin.pricingFree')}</span>
      </div>
      <Text type="secondary">{t('plugin.exampleHint', { taskId })}</Text>
    </div>
  )
}
