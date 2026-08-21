import { Button, Typography } from 'antd'
import type { PluginView } from '@shared/plugin/types'
import type { ViewPluginContext } from '@shared/plugin/viewHost'
import { useI18n } from '@renderer/i18n/useI18n'
import { isPluginLicenseActive } from '@renderer/plugin/pluginLicense'
import { openProfileTab } from '@renderer/plugin/openProfileTab'
import styles from '../plugin.module.css'

const { Text } = Typography

interface Props {
  plugin: PluginView
  groupId: string
  taskId?: string
  context?: ViewPluginContext
}

/** `lanpm.agile` — 无许可 CTA；卡片槽不展示点数 */
export default function AgileStub({ plugin, context }: Props): React.ReactElement | null {
  const { t } = useI18n()
  const licenseActive = isPluginLicenseActive(plugin)

  if (context?.view !== 'board') return null
  if (context.zone === 'card') return null

  return (
    <div
      className={styles.scheduleToolbar}
      data-testid="agile-board-toolbar"
      data-plugin-id={plugin.id}
    >
      {licenseActive ? (
        <Text type="secondary">{t('plugin.agileLicensedIdle')}</Text>
      ) : (
        <div className={styles.meetingToolbarCta} data-testid="agile-license-cta">
          <Text type="secondary">{t('plugin.agileLicenseCta')}</Text>
          <Button type="link" size="small" onClick={() => openProfileTab('plugins')}>
            {t('plugin.meetingOpenPlugins')}
          </Button>
        </div>
      )}
    </div>
  )
}
