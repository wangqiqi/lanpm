import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Input, InputNumber, Select, Switch, Typography, message } from 'antd'
import type { PluginView } from '@shared/plugin/types'
import type { ViewPluginContext } from '@shared/plugin/viewHost'
import type { Task, TaskStatus } from '@shared/task/types'
import { formatColumnPointSums, parseStoryPoints, sumStoryPointsByStatus } from '@shared/task/storyPoints'
import {
  addDaysYmd,
  burndownPolyline,
  localYmd,
  type AgileBurndownView
} from '@shared/task/agileBurndown'
import type { AgileIterationSnapshot } from '@shared/task/agileIteration'
import { velocityBarRects, type AgileVelocityView } from '@shared/task/agileVelocity'
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
import { publishAgileIteration } from '@renderer/plugin/agileIterationBridge'
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

function clearBridges(groupId: string): void {
  publishAgileWip({ groupId, limits: {}, over: [] })
  publishAgileIteration({ groupId, currentIterationId: null })
}

/** `lanpm.agile` — 无许可 CTA；授权后列合计 + 卡片估点 + 迭代容器 */
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
  const [velocity, setVelocity] = useState<AgileVelocityView | null>(null)
  const [wipLimits, setWipLimits] = useState<ColumnWipLimits>({})
  const [iterations, setIterations] = useState<AgileIterationSnapshot | null>(null)
  const [draftName, setDraftName] = useState('')
  const [draftStart, setDraftStart] = useState(() => localYmd(new Date()))
  const [draftEnd, setDraftEnd] = useState(() => addDaysYmd(localYmd(new Date()), 13))

  const reload = useCallback(async () => {
    if (!licenseActive || !groupId) {
      setTasks([])
      setBurndown(null)
      setVelocity(null)
      setWipLimits({})
      setIterations(null)
      if (groupId) clearBridges(groupId)
      return
    }
    try {
      const list = (await getLanpmApi().plugin.invokeCapability(plugin.id, 'task.list', {
        groupId
      })) as Task[]
      const live = list.filter((task) => !task.deletedAt)
      setTasks(live)
      const iter = await getLanpmApi().task.getAgileIterations(groupId)
      setIterations(iter)
      publishAgileIteration({
        groupId,
        currentIterationId: iter.currentIterationId
      })
      const chart = await getLanpmApi().task.getAgileBurndown(groupId, iter.currentIterationId)
      setBurndown(chart)
      const vel = await getLanpmApi().task.getAgileVelocity(groupId)
      setVelocity(vel)
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
      setVelocity(null)
      setWipLimits({})
      setIterations(null)
      clearBridges(groupId)
    }
  }, [groupId, licenseActive, plugin.id, t])

  useEffect(() => {
    void reload()
    if (!licenseActive || !groupId) {
      return () => clearBridges(groupId)
    }
    const unsub = getLanpmApi().task.onTasksChanged((changedGroupId) => {
      if (changedGroupId === groupId) void reload()
    })
    return () => {
      unsub()
      clearBridges(groupId)
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

  const onToggleIteration = useCallback(
    async (id: string, inIteration: boolean) => {
      const current = iterations?.currentIterationId
      if (!current) return
      setBusy(true)
      try {
        const updated = await invokeCapabilityWithHumanConfirm(
          plugin.id,
          'task.patch',
          { groupId, taskId: id, patch: { iterationId: inIteration ? current : null } },
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
    [confirmCopy, groupId, iterations?.currentIterationId, plugin.id, reload, t]
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

  const onSelectIteration = useCallback(
    async (value: string) => {
      setBusy(true)
      try {
        await getLanpmApi().task.setCurrentAgileIteration(groupId, value || null)
        await reload()
      } catch (err: unknown) {
        message.warning(err instanceof Error ? err.message : t('plugin.capabilityFailed'))
      } finally {
        setBusy(false)
      }
    },
    [groupId, reload, t]
  )

  const onCreateIteration = useCallback(async () => {
    setBusy(true)
    try {
      await getLanpmApi().task.createAgileIteration(groupId, draftName, draftStart, draftEnd)
      setDraftName('')
      await reload()
    } catch (err: unknown) {
      message.warning(err instanceof Error ? err.message : t('plugin.capabilityFailed'))
    } finally {
      setBusy(false)
    }
  }, [draftEnd, draftName, draftStart, groupId, reload, t])

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
    const currentId = iterations?.currentIterationId ?? null
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
        {currentId ? (
          <label className={styles.agileCardIter} data-testid="agile-iteration-card">
            <Switch
              size="small"
              disabled={busy}
              checked={task?.iterationId === currentId}
              onChange={(checked) => void onToggleIteration(taskId, checked)}
            />
            <Text type="secondary">{t('plugin.agileIterationIn')}</Text>
          </label>
        ) : null}
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
  const velocityRects = velocity ? velocityBarRects(velocity.bars, 128, 28) : []
  return (
    <div
      className={styles.scheduleToolbar}
      data-testid="agile-board-toolbar"
      data-plugin-id={plugin.id}
    >
      <span className={styles.agileIterRow} data-testid="agile-iteration">
        <Select
          size="small"
          disabled={busy}
          className={styles.agileIterSelect}
          data-testid="agile-iteration-select"
          value={iterations?.currentIterationId ?? ''}
          onChange={(value) => void onSelectIteration(value)}
          options={[
            { value: '', label: t('plugin.agileIterationAll') },
            ...(iterations?.iterations ?? []).map((row) => ({
              value: row.iterationId,
              label: row.name
            }))
          ]}
        />
        <Input
          size="small"
          disabled={busy}
          className={styles.agileIterName}
          placeholder={t('plugin.agileIterationName')}
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
        />
        <Input
          size="small"
          type="date"
          disabled={busy}
          value={draftStart}
          aria-label={t('plugin.agileIterationStart')}
          onChange={(e) => setDraftStart(e.target.value)}
        />
        <Input
          size="small"
          type="date"
          disabled={busy}
          value={draftEnd}
          aria-label={t('plugin.agileIterationEnd')}
          onChange={(e) => setDraftEnd(e.target.value)}
        />
        <Button
          size="small"
          disabled={busy}
          data-testid="agile-iteration-create"
          onClick={() => void onCreateIteration()}
        >
          {t('plugin.agileIterationCreate')}
        </Button>
      </span>
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
      <span className={styles.agileBurndown} data-testid="agile-velocity">
        <Text type="secondary">
          {t('plugin.agileVelocity')}
          {velocity && velocity.bars.some((b) => b.completedPoints > 0)
            ? ` ${velocity.bars.map((b) => b.completedPoints).join(' · ')}`
            : ` ${t('plugin.agileVelocityEmpty')}`}
        </Text>
        {velocityRects.length > 0 ? (
          <svg className={styles.agileBurndownSvg} viewBox="0 0 128 28" aria-hidden>
            {velocityRects.map((rect) => (
              <rect
                key={rect.iterationId}
                x={rect.x}
                y={rect.y}
                width={rect.width}
                height={rect.height}
                fill="var(--lanpm-accent)"
              />
            ))}
          </svg>
        ) : null}
      </span>
    </div>
  )
}
