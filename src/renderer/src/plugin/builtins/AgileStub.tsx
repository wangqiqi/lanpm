import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, InputNumber, Typography, message } from 'antd'
import type { PluginView } from '@shared/plugin/types'
import type { ViewPluginContext } from '@shared/plugin/viewHost'
import type { Task, TaskStatus } from '@shared/task/types'
import { formatColumnPointSums, parseStoryPoints, sumStoryPointsByStatus } from '@shared/task/storyPoints'
import {
  burndownPolyline,
  type AgileBurndownView
} from '@shared/task/agileBurndown'
import {
  COLUMN_WIP_STATUSES,
  countTasksByStatus,
  overWipColumns,
  parseWipLimit,
  type ColumnWipLimits
} from '@shared/task/columnWip'
import { useI18n } from '@renderer/i18n/useI18n'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { invokeCapabilityWithHumanConfirm } from '@renderer/plugin/invokeCapabilityWithHumanConfirm'
import { isPluginLicenseActive } from '@renderer/plugin/pluginLicense'
import { openProfileTab } from '@renderer/plugin/openProfileTab'
import { publishAgileWip } from '@renderer/plugin/agileWipBridge'
import styles from '../plugin.module.css'

const { Text } = Typography

interface Props {
  plugin: PluginView
  groupId: string
  taskId?: string
  context?: ViewPluginContext
}

const STATUS_LABEL_KEYS: Record<TaskStatus, 'board.columnTodo' | 'board.columnDoing' | 'board.columnDone' | 'board.columnOther'> =
  {
    todo: 'board.columnTodo',
    doing: 'board.columnDoing',
    done: 'board.columnDone',
    other: 'board.columnOther'
  }

/** `lanpm.agile` — 无许可 CTA；授权后列合计 + 卡片估点 */
export default function AgileStub({
  plugin,
  groupId,
  taskId,
  context
}: Props): React.ReactElement | null {
  const { t } = useI18n()
  const licenseActive = isPluginLicenseActive(plugin)
  const [tasks, setTasks] = useState<Task[]>([])
  const [busy, setBusy] = useState(false)
  const [burndown, setBurndown] = useState<AgileBurndownView | null>(null)
  const [wipLimits, setWipLimits] = useState<ColumnWipLimits>({})

  const reload = useCallback(async () => {
    if (!licenseActive || !groupId) {
      setTasks([])
      setBurndown(null)
      setWipLimits({})
      if (groupId) publishAgileWip({ groupId, limits: {}, over: [] })
      return
    }
    try {
      const list = (await getLanpmApi().plugin.invokeCapability(plugin.id, 'task.list', {
        groupId
      })) as Task[]
      const live = list.filter((task) => !task.deletedAt)
      setTasks(live)
      const chart = await getLanpmApi().task.getAgileBurndown(groupId)
      setBurndown(chart)
      const snap = await getLanpmApi().task.getAgileWipLimits(groupId)
      setWipLimits(snap.limits)
      publishAgileWip({
        groupId,
        limits: snap.limits,
        over: overWipColumns(countTasksByStatus(live), snap.limits)
      })
    } catch (err: unknown) {
      message.warning(err instanceof Error ? err.message : t('plugin.capabilityFailed'))
      setTasks([])
      setBurndown(null)
      setWipLimits({})
      publishAgileWip({ groupId, limits: {}, over: [] })
    }
  }, [groupId, licenseActive, plugin.id, t])

  useEffect(() => {
    void reload()
    if (!licenseActive || !groupId) {
      return () => publishAgileWip({ groupId, limits: {}, over: [] })
    }
    const unsub = getLanpmApi().task.onTasksChanged((changedGroupId) => {
      if (changedGroupId === groupId) void reload()
    })
    return () => {
      unsub()
      publishAgileWip({ groupId, limits: {}, over: [] })
    }
  }, [reload, groupId, licenseActive])

  const confirmCopy = useMemo(
    () => ({
      title: t('plugin.confirmWriteTitle'),
      content: t('plugin.confirmWriteBody', { capability: 'task.patch' }),
      okText: t('plugin.confirmWriteOk'),
      cancelText: t('plugin.confirmWriteCancel')
    }),
    [t]
  )

  const onSavePoints = useCallback(
    async (id: string, next: number | null) => {
      setBusy(true)
      try {
        const updated = await invokeCapabilityWithHumanConfirm(
          plugin.id,
          'task.patch',
          { groupId, taskId: id, patch: { storyPoints: next } },
          confirmCopy
        )
        if (updated == null) return
        await reload()
      } catch (err: unknown) {
        message.warning(err instanceof Error ? err.message : t('plugin.capabilityFailed'))
      } finally {
        setBusy(false)
      }
    },
    [confirmCopy, groupId, plugin.id, reload, t]
  )

  const onSaveWip = useCallback(
    async (status: TaskStatus, next: number | null) => {
      setBusy(true)
      try {
        const snap = await getLanpmApi().task.setAgileWipLimit(groupId, status, next)
        setWipLimits(snap.limits)
        publishAgileWip({
          groupId,
          limits: snap.limits,
          over: overWipColumns(countTasksByStatus(tasks), snap.limits)
        })
      } catch (err: unknown) {
        message.warning(err instanceof Error ? err.message : t('plugin.capabilityFailed'))
      } finally {
        setBusy(false)
      }
    },
    [groupId, t, tasks]
  )

  if (context?.view !== 'board') return null

  if (!licenseActive) {
    if (context.zone === 'card') return null
    return (
      <div
        className={styles.scheduleToolbar}
        data-testid="agile-board-toolbar"
        data-plugin-id={plugin.id}
      >
        <div className={styles.meetingToolbarCta} data-testid="agile-license-cta">
          <Text type="secondary">{t('plugin.agileLicenseCta')}</Text>
          <Button type="link" size="small" onClick={() => openProfileTab('plugins')}>
            {t('plugin.meetingOpenPlugins')}
          </Button>
        </div>
      </div>
    )
  }

  if (context.zone === 'card') {
    if (!taskId) return null
    const task = tasks.find((item) => item.taskId === taskId)
    const points = parseStoryPoints(task?.storyPoints)
    return (
      <div className={styles.agileCardPoints} data-testid="agile-story-points" data-task-id={taskId}>
        <InputNumber
          size="small"
          min={1}
          max={99}
          disabled={busy}
          placeholder={t('plugin.agilePoints')}
          value={points}
          onChange={(value) => {
            const n = typeof value === 'number' ? value : null
            void onSavePoints(taskId, n)
          }}
        />
      </div>
    )
  }

  const sums = sumStoryPointsByStatus(tasks)
  const labels = {
    todo: t(STATUS_LABEL_KEYS.todo),
    doing: t(STATUS_LABEL_KEYS.doing),
    done: t(STATUS_LABEL_KEYS.done),
    other: t(STATUS_LABEL_KEYS.other)
  }
  const yMax = Math.max(burndown?.total ?? 0, burndown?.remaining ?? 0, 1)
  const actualLine = burndown
    ? burndownPolyline(burndown.samples, 128, 28, yMax)
    : ''
  const idealLine = burndown ? burndownPolyline(burndown.ideal, 128, 28, yMax) : ''
  return (
    <div
      className={styles.scheduleToolbar}
      data-testid="agile-board-toolbar"
      data-plugin-id={plugin.id}
    >
      <Text type="secondary" data-testid="agile-column-sums">
        {t('plugin.agileColumnSums')}: {formatColumnPointSums(sums, labels)}
      </Text>
      <span className={styles.agileWipRow} data-testid="agile-wip">
        {COLUMN_WIP_STATUSES.map((status) => (
          <label key={status} className={styles.agileWipField}>
            <Text type="secondary">{labels[status]}</Text>
            <InputNumber
              size="small"
              min={1}
              max={99}
              disabled={busy}
              placeholder={t('plugin.agileWip')}
              value={parseWipLimit(wipLimits[status]) ?? null}
              onChange={(value) => {
                const n = typeof value === 'number' ? value : null
                void onSaveWip(status, n)
              }}
            />
          </label>
        ))}
      </span>
      {burndown ? (
        <span className={styles.agileBurndown} data-testid="agile-burndown">
          <Text type="secondary">
            {t('plugin.agileBurndown')} {burndown.remaining}/{burndown.total}
          </Text>
          <svg
            className={styles.agileBurndownSvg}
            viewBox="0 0 128 28"
            aria-hidden
          >
            {idealLine ? (
              <polyline
                fill="none"
                stroke="var(--lanpm-border)"
                strokeWidth="1.5"
                points={idealLine}
              />
            ) : null}
            {actualLine ? (
              <polyline
                fill="none"
                stroke="var(--lanpm-accent)"
                strokeWidth="1.5"
                points={actualLine}
              />
            ) : null}
          </svg>
        </span>
      ) : null}
    </div>
  )
}
