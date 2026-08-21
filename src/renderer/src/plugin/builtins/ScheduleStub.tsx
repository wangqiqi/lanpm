import { useCallback, useEffect, useState } from 'react'
import { Button, Switch, Typography, message } from 'antd'
import type { PluginView } from '@shared/plugin/types'
import type { ViewPluginContext } from '@shared/plugin/viewHost'
import type { Task } from '@shared/task/types'
import { computeCriticalPath } from '@shared/task/criticalPath'
import { countSlippedVsBaseline, type ScheduleBaselineSnapshot } from '@shared/task/scheduleBaseline'
import { defaultScheduleForTask as taskDates } from '@shared/task/ganttAdapter'
import { useI18n } from '@renderer/i18n/useI18n'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { isPluginLicenseActive } from '@renderer/plugin/pluginLicense'
import { openProfileTab } from '@renderer/plugin/openProfileTab'
import { publishScheduleCriticalPath } from '@renderer/plugin/scheduleCriticalPathBridge'
import { publishScheduleBaseline } from '@renderer/plugin/scheduleBaselineBridge'
import styles from '../plugin.module.css'

const { Text } = Typography

interface Props {
  plugin: PluginView
  groupId: string
  context?: ViewPluginContext
}

/** `lanpm.schedule` — 无许可 CTA；授权后关键路径 + 冻结基线 */
export default function ScheduleStub({ plugin, groupId, context }: Props): React.ReactElement | null {
  const { t } = useI18n()
  const licenseActive = isPluginLicenseActive(plugin)
  const [pathOn, setPathOn] = useState(false)
  const [busy, setBusy] = useState(false)
  const [freezeBusy, setFreezeBusy] = useState(false)
  const [snapshot, setSnapshot] = useState<ScheduleBaselineSnapshot | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])

  const publishSnap = useCallback(
    (next: ScheduleBaselineSnapshot | null) => {
      setSnapshot(next)
      publishScheduleBaseline({
        groupId,
        snapshot: next?.frozenAt ? next : null
      })
    },
    [groupId]
  )

  const loadBaseline = useCallback(async () => {
    const api = getLanpmApi()
    const snap = await api.task.getScheduleBaseline(groupId)
    const listed = (await api.plugin.invokeCapability(plugin.id, 'task.list', {
      groupId
    })) as Task[]
    setTasks(listed)
    publishSnap(snap.frozenAt ? snap : null)
  }, [groupId, plugin.id, publishSnap])

  useEffect(() => {
    if (!licenseActive || context?.view !== 'gantt') return
    void loadBaseline().catch(() => publishSnap(null))
    return () => publishScheduleBaseline({ groupId, snapshot: null })
  }, [licenseActive, context?.view, groupId, loadBaseline, publishSnap])

  const applyPath = useCallback(
    async (next: boolean) => {
      if (!next) {
        setPathOn(false)
        publishScheduleCriticalPath({ groupId, active: false, taskIds: [] })
        return
      }
      setBusy(true)
      try {
        const listed = (await getLanpmApi().plugin.invokeCapability(plugin.id, 'task.list', {
          groupId
        })) as Task[]
        setTasks(listed)
        const result = computeCriticalPath(listed)
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

  const freeze = useCallback(async () => {
    setFreezeBusy(true)
    try {
      await getLanpmApi().task.freezeScheduleBaseline(groupId)
      await loadBaseline()
      message.success(t('plugin.scheduleBaselineFrozen'))
    } catch (err: unknown) {
      message.warning(err instanceof Error ? err.message : t('plugin.capabilityFailed'))
    } finally {
      setFreezeBusy(false)
    }
  }, [groupId, loadBaseline, t])

  if (context?.view !== 'gantt') return null

  const slipped =
    snapshot?.frozenAt && tasks.length > 0
      ? countSlippedVsBaseline(
          new Map(
            tasks.filter((item) => !item.deletedAt).map((item) => [item.taskId, taskDates(item)])
          ),
          snapshot
        )
      : 0

  return (
    <div
      className={styles.scheduleToolbar}
      data-testid="schedule-gantt-toolbar"
      data-plugin-id={plugin.id}
    >
      {licenseActive ? (
        <>
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
          <Button
            size="small"
            loading={freezeBusy}
            data-testid="schedule-freeze-baseline"
            onClick={() => void freeze()}
          >
            {t('plugin.scheduleFreezeBaseline')}
          </Button>
          {snapshot?.frozenAt ? (
            <Text type="secondary" data-testid="schedule-baseline-hint">
              {slipped > 0
                ? t('plugin.scheduleBaselineSlipped', { count: slipped })
                : t('plugin.scheduleBaselineOnTrack')}
            </Text>
          ) : null}
        </>
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
