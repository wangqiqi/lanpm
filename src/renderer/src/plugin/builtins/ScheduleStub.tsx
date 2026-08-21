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
  context?: ViewPluginContext
}

/** `lanpm.schedule` — 甘特工具条：无许可 CTA；有许可不绕过 Host 许可闸 */
export default function ScheduleStub({ plugin, context }: Props): React.ReactElement | null {
  const { t } = useI18n()
  const licenseActive = isPluginLicenseActive(plugin)

  if (context?.view !== 'gantt') return null

  return (
    <div
      className={styles.scheduleToolbar}
      data-testid="schedule-gantt-toolbar"
      data-plugin-id={plugin.id}
    >
      {licenseActive ? (
        <Text type="secondary">{t('plugin.scheduleLicensedIdle')}</Text>
      ) : (
        <div className={styles.meetingToolbarCta} data-testid="schedule-license-cta">
          <Text type="secondary">{t('plugin.scheduleLicenseCta')}</Text>
          <Button type="link" size="small" onClick={() => openProfileTab('plugins')}>
            {t('plugin.meetingOpenPlugins')}
          </Button>
        </div>
      )}
    </div>
  )
}
