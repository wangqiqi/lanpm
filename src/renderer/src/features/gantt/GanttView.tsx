import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Input, Modal, Radio, Select, Space, Tag, Typography } from 'antd'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import { DownloadOutlined, FilePdfOutlined, PlusOutlined } from '@ant-design/icons'
import { Gantt, ViewMode, type Task as GanttTask } from 'gantt-task-react'
import 'gantt-task-react/dist/index.css'
import { useNavigate, useParams } from 'react-router-dom'
import { groupViewPath } from '@renderer/routes/paths'
import type { TaskDependencyType } from '@shared/task/dependency'
import { tasksToGanttBars, ganttDatesToYmd, defaultScheduleForTask } from '@shared/task/ganttAdapter'
import type { Task } from '@shared/task/types'
import { useTaskStore } from '@renderer/stores/taskStore'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { exportElementToPdf, exportElementToPng } from './ganttExport'
import ViewToolbar, { ViewToolbarGroup, ViewToolbarHint } from '@renderer/ui/ViewToolbar'
import { ViewEmptyHint, ViewLoadingCenter } from '@renderer/ui/ViewState'
import { readCssVar } from '@renderer/ui/cssVar'
import { useUiStore } from '@renderer/stores/uiStore'
import { useI18n } from '@renderer/i18n/useI18n'
import styles from './gantt.module.css'

const { Text } = Typography

export default function GanttView(): React.ReactElement {
  const { t } = useI18n()
  const { message } = useLanpmApp()
  const navigate = useNavigate()
  const { groupId } = useParams<{ groupId: string }>()
  const gid = groupId ?? ''
  const tasks = useTaskStore((s) => s.tasksByGroup[gid] ?? [])
  const loading = useTaskStore((s) => s.loading[gid])
  const loadTasks = useTaskStore((s) => s.loadTasks)
  const updateSchedule = useTaskStore((s) => s.updateSchedule)
  const upsertDependency = useTaskStore((s) => s.upsertDependency)

  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Week)
  const [depOpen, setDepOpen] = useState(false)
  const [fromId, setFromId] = useState<string>()
  const [toId, setToId] = useState<string>()
  const [depType, setDepType] = useState<TaskDependencyType>('FS')
  const [exporting, setExporting] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduleTask, setScheduleTask] = useState<Task | null>(null)
  const [scheduleStart, setScheduleStart] = useState('')
  const [scheduleEnd, setScheduleEnd] = useState('')
  const [scheduleSaving, setScheduleSaving] = useState(false)
  const chartRef = useRef<HTMLDivElement>(null)
  const themeMode = useUiStore((s) => s.theme)
  const [todayColor, setTodayColor] = useState(() =>
    readCssVar('--lanpm-accent-fill', 'rgba(0, 113, 227, 0.08)')
  )
  useEffect(() => {
    setTodayColor(readCssVar('--lanpm-accent-fill', 'rgba(0, 113, 227, 0.08)'))
  }, [themeMode])

  const viewOptions = useMemo(
    () => [
      { label: t('gantt.viewDay'), value: ViewMode.Day },
      { label: t('gantt.viewWeek'), value: ViewMode.Week },
      { label: t('gantt.viewMonth'), value: ViewMode.Month }
    ],
    [t]
  )

  const depTypes = useMemo(
    (): { value: TaskDependencyType; label: string }[] => [
      { value: 'FS', label: t('gantt.depFS') },
      { value: 'SS', label: t('gantt.depSS') },
      { value: 'FF', label: t('gantt.depFF') },
      { value: 'SF', label: t('gantt.depSF') }
    ],
    [t]
  )

  useEffect(() => {
    if (!gid) return
    void loadTasks(gid)
    const unsub = getLanpmApi().task.onTasksChanged((changedGroupId) => {
      if (changedGroupId === gid) void loadTasks(gid)
    })
    return unsub
  }, [gid, loadTasks])

  const ganttTasks = useMemo(() => {
    const allDeps = tasks.flatMap((t) => t.dependencies ?? [])
    return tasksToGanttBars(tasks, allDeps)
  }, [tasks])

  const taskOptions = useMemo(
    () => tasks.map((t) => ({ label: t.title, value: t.taskId })),
    [tasks]
  )

  const onDateChange = useCallback(
    (bar: GanttTask) => {
      const task = tasks.find((t) => t.taskId === bar.id)
      if (!task) return
      const { startDate, endDate } = ganttDatesToYmd(bar.start, bar.end, task.milestone)
      void updateSchedule({ taskId: task.taskId, startDate, endDate }).catch((err: unknown) => {
        message.error(err instanceof Error ? err.message : t('gantt.scheduleFailed'))
      })
    },
    [tasks, updateSchedule, t]
  )

  const addDependency = async (): Promise<void> => {
    if (!gid || !fromId || !toId) {
      message.warning(t('gantt.selectBothTasks'))
      return
    }
    try {
      await upsertDependency({
        groupId: gid,
        fromTaskId: fromId,
        toTaskId: toId,
        type: depType
      })
      message.success(t('gantt.dependencySaved'))
      setDepOpen(false)
      setFromId(undefined)
      setToId(undefined)
    } catch (err) {
      message.error(err instanceof Error ? err.message : t('gantt.dependencyFailed'))
    }
  }

  const toggleMilestone = async (task: Task): Promise<void> => {
    try {
      await getLanpmApi().task.updateTask({
        taskId: task.taskId,
        milestone: !task.milestone
      })
      await loadTasks(gid)
    } catch (err) {
      message.error(err instanceof Error ? err.message : t('gantt.milestoneFailed'))
    }
  }

  const openScheduleModal = (task: Task): void => {
    const sched = defaultScheduleForTask(task)
    setScheduleTask(task)
    setScheduleStart(sched.startDate)
    setScheduleEnd(sched.endDate)
    setScheduleOpen(true)
  }

  const saveSchedule = async (): Promise<void> => {
    if (!scheduleTask) return
    setScheduleSaving(true)
    try {
      await updateSchedule({
        taskId: scheduleTask.taskId,
        startDate: scheduleStart,
        endDate: scheduleEnd
      })
      message.success(t('gantt.scheduleSaved'))
      setScheduleOpen(false)
    } catch (err) {
      message.error(err instanceof Error ? err.message : t('gantt.scheduleFailed'))
    } finally {
      setScheduleSaving(false)
    }
  }

  const exportChart = async (format: 'png' | 'pdf'): Promise<void> => {
    const el = chartRef.current
    if (!el) return
    setExporting(true)
    try {
      const stamp = new Date().toISOString().slice(0, 10)
      const base = `gantt-${gid || 'group'}-${stamp}`
      if (format === 'png') {
        await exportElementToPng(el, `${base}.png`)
      } else {
        await exportElementToPdf(el, `${base}.pdf`)
      }
      message.success(format === 'png' ? t('gantt.exportPngDone') : t('gantt.exportPdfDone'))
    } catch (err) {
      message.error(err instanceof Error ? err.message : t('gantt.exportFailed'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className={styles.root}>
      <ViewToolbar
        start={
          <Radio.Group
            optionType="button"
            value={viewMode}
            options={viewOptions.map((o) => ({ label: o.label, value: o.value }))}
            onChange={(e) => setViewMode(e.target.value as ViewMode)}
          />
        }
        end={
          <ViewToolbarGroup>
            <Button icon={<PlusOutlined />} onClick={() => setDepOpen(true)}>
              {t('gantt.addDependency')}
            </Button>
            <Button
              icon={<DownloadOutlined />}
              loading={exporting}
              disabled={ganttTasks.length === 0}
              onClick={() => void exportChart('png')}
            >
              {t('gantt.exportPng')}
            </Button>
            <Button
              icon={<FilePdfOutlined />}
              loading={exporting}
              disabled={ganttTasks.length === 0}
              onClick={() => void exportChart('pdf')}
            >
              {t('gantt.exportPdf')}
            </Button>
            <ViewToolbarHint>{t('gantt.toolbarHint')}</ViewToolbarHint>
          </ViewToolbarGroup>
        }
      />

      {loading && tasks.length === 0 ? (
        <ViewLoadingCenter />
      ) : ganttTasks.length === 0 ? (
        <ViewEmptyHint>{t('gantt.empty')}</ViewEmptyHint>
      ) : (
        <div className={styles.chartWrap} ref={chartRef}>
          <Gantt
            tasks={ganttTasks}
            viewMode={viewMode}
            onDateChange={onDateChange}
            onClick={(bar) => {
              const task = tasks.find((t) => t.taskId === bar.id)
              if (task) openScheduleModal(task)
            }}
            onDoubleClick={(bar) => {
              const task = tasks.find((t) => t.taskId === bar.id)
              if (task) void toggleMilestone(task)
            }}
            listCellWidth=""
            columnWidth={viewMode === ViewMode.Month ? 300 : viewMode === ViewMode.Week ? 200 : 60}
            rowHeight={44}
            barFill={56}
            todayColor={todayColor}
            TooltipContent={({ task: bar }) => {
              const task = tasks.find((t) => t.taskId === bar.id)
              const deps = task?.dependencies ?? []
              return (
                <div className={styles.tooltip}>
                  <div>{bar.name}</div>
                  {deps.length > 0 && (
                    <div>
                      {t('gantt.depsLabel')}
                      {deps.map((d) => (
                        <Tag
                          key={`${d.fromTaskId}-${d.type}`}
                          color="default"
                          style={{ marginTop: 4 }}
                        >
                          {d.type}: {d.fromTaskId.slice(-6)} → {d.toTaskId.slice(-6)}
                        </Tag>
                      ))}
                    </div>
                  )}
                  <div className={styles.tooltipHint}>{t('gantt.milestoneHint')}</div>
                  <div className={styles.tooltipHint}>{t('gantt.clickEditHint')}</div>
                </div>
              )
            }}
          />
        </div>
      )}

      <Modal
        title={t('gantt.depModalTitle')}
        open={depOpen}
        onCancel={() => setDepOpen(false)}
        onOk={() => void addDependency()}
        destroyOnHidden
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text type="secondary">{t('gantt.fromTask')}</Text>
            <Select
              style={{ width: '100%', marginTop: 4 }}
              placeholder={t('gantt.selectFrom')}
              options={taskOptions}
              value={fromId}
              onChange={setFromId}
            />
          </div>
          <div>
            <Text type="secondary">{t('gantt.toTask')}</Text>
            <Select
              style={{ width: '100%', marginTop: 4 }}
              placeholder={t('gantt.selectTo')}
              options={taskOptions}
              value={toId}
              onChange={setToId}
            />
          </div>
          <div>
            <Text type="secondary">{t('gantt.depType')}</Text>
            <Select
              style={{ width: '100%', marginTop: 4 }}
              options={depTypes}
              value={depType}
              onChange={setDepType}
            />
          </div>
        </Space>
      </Modal>

      <Modal
        title={t('gantt.scheduleModalTitle')}
        open={scheduleOpen}
        onCancel={() => setScheduleOpen(false)}
        onOk={() => void saveSchedule()}
        confirmLoading={scheduleSaving}
        okText={t('common.save')}
        destroyOnHidden
        footer={(_, { OkBtn, CancelBtn }) => (
          <>
            <Button
              type="link"
              onClick={() => {
                if (!scheduleTask) return
                setScheduleOpen(false)
                navigate(groupViewPath(gid, 'board'), {
                  state: { highlightTaskId: scheduleTask.taskId }
                })
              }}
            >
              {t('gantt.openInBoard')}
            </Button>
            <CancelBtn />
            <OkBtn />
          </>
        )}
      >
        {scheduleTask && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Text strong>{scheduleTask.title}</Text>
            <div>
              <Text type="secondary">{t('gantt.scheduleStart')}</Text>
              <Input
                type="date"
                value={scheduleStart}
                onChange={(e) => setScheduleStart(e.target.value)}
                style={{ width: '100%', marginTop: 4 }}
              />
            </div>
            <div>
              <Text type="secondary">{t('gantt.scheduleEnd')}</Text>
              <Input
                type="date"
                value={scheduleEnd}
                onChange={(e) => setScheduleEnd(e.target.value)}
                style={{ width: '100%', marginTop: 4 }}
              />
            </div>
          </Space>
        )}
      </Modal>
    </div>
  )
}
