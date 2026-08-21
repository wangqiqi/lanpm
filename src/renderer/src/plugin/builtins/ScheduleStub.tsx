import { useCallback, useState } from 'react'
import { Button, Switch, Typography, message } from 'antd'
import type { PluginView } from '@shared/plugin/types'
import type { ViewPluginContext } from '@shared/plugin/viewHost'
import type { Task } from '@shared/task/types'
import { computeCriticalPath } from '@shared/task/criticalPath'
import { useI18n } from '@renderer/i18n/useI18n'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { isPluginLicenseActive } from '@renderer/plugin/pluginLicense'
import { openProfileTab } from '@renderer/plugin/openProfileTab'
import { publishScheduleCriticalPath } from '@renderer/plugin/scheduleCriticalPathBridge'
import styles from '../plugin.module.css'

const { Text } = Typography

interface Props {
  plugin: PluginView
  groupId: string
  context?: ViewPluginContext
}

/** `lanpm.schedule` — 无许可 CTA；授权后开关关键路径高亮（FS/SS/FF/SF 边） */
export default function ScheduleStub({ plugin, groupId, context }: Props): React.ReactElement | null {
  const { t } = useI18n()
  const licenseActive = isPluginLicenseActive(plugin)
  const [pathOn, setPathOn] = useState(false)
  const [busy, setBusy] = useState(false)

  const applyPath = useCallback(
    async (next: boolean) => {
      if (!next) {
        setPathOn(false)
        publishScheduleCriticalPath({ groupId, active: false, taskIds: [] })
        return
      }
      setBusy(true)
      try {
        const tasks = (await getLanpmApi().plugin.invokeCapability(plugin.id, 'task.list', {
          groupId
        })) as Task[]
        const result = computeCriticalPath(tasks)
        setPathOn(true)
        publishScheduleCriticalPath({
          groupId,
          active: true,
          taskIds: result.taskIds
        })
        if (result.taskIds.length === 0) {
          if (result.emptyReason === 'cycle') {
            message.info(t('plugin.scheduleCriticalPathCycle'))
          } else {
            message.info(t('plugin.scheduleCriticalPathEmpty'))
          }
        }
      } catch (err: unknown) {
        setPathOn(false)
        publishScheduleCriticalPath({ groupId, active: false, taskIds: [] })
        message.warning(err instanceof Error ? err.message : t('plugin.capabilityFailed'))
      } finally {
        setBusy(false)
      }
    },
    [groupId, plugin.id, t]
  )

  if (context?.view !== 'gantt') return null

  return (
    <div
      className={styles.scheduleToolbar}
      data-testid="schedule-gantt-toolbar"
      data-plugin-id={plugin.id}
    >
      {licenseActive ? (
        <label className={styles.scheduleToggle}>
          <Switch
            size="small"
            checked={pathOn}
            loading={busy}
            data-testid="schedule-critical-path-switch"
            onChange={(checked) => void applyPath(checked)}
          />
          <Text>{t('plugin.scheduleCriticalPath')}</Text>
        </label>
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
