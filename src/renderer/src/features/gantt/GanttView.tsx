import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Button, Input, Modal, Select, Space, Tag, Typography } from 'antd'

const { Text } = Typography
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import { DownloadOutlined, FilePdfOutlined, PlusOutlined, ZoomInOutlined, ZoomOutOutlined } from '@ant-design/icons'
import { Gantt, ViewMode, type Task as GanttTask } from 'gantt-task-react'
import 'gantt-task-react/dist/index.css'
import { useNavigate, useParams } from 'react-router-dom'
import { groupViewPath } from '@renderer/routes/paths'
import type { TaskDependencyType } from '@shared/task/dependency'
import { tasksToGanttBars, ganttDatesToYmd, defaultScheduleForTask } from '@shared/task/ganttAdapter'
import type { Task } from '@shared/task/types'
import { useTaskStore } from '@renderer/stores/taskStore'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { patchGanttCalendarLabels } from './ganttCalendarLabels'
import { exportGanttChart } from './ganttExport'
import { computeGanttTimelineDates } from '@shared/task/ganttTimeline'
import {
  GANTT_HANDLE_WIDTH,
  GANTT_ZOOM_LEVELS,
  ganttColumnWidthForView,
  ganttTimeStepForView,
  nextGanttZoomIn,
  nextGanttZoomOut
} from './ganttDragConfig'
import ViewToolbar, {
  ViewToolbarGroup,
  ViewToolbarHint,
  ViewToolbarPair
} from '@renderer/ui/ViewToolbar'
import ViewCrossLink from '@renderer/ui/ViewCrossLink'
import RegionButton from '@renderer/ui/RegionButton'
import ViewSegment from '@renderer/ui/ViewSegment'
import { ViewEmptyHint, ViewLoadingCenter } from '@renderer/ui/ViewState'
import IslandPanel from '@renderer/ui/IslandPanel'
import { readCssVar } from '@renderer/ui/cssVar'
import { LANPM_ACCENT, LANPM_ACCENT_FILL_RGBA } from '@shared/design/lanpmDesignTokens'
import { useUiStore } from '@renderer/stores/uiStore'
import { useSearchHighlight } from '@renderer/hooks/useSearchHighlight'
import { listTaskPredecessors, listTaskSuccessors } from '@shared/task/boardRelations'
import { validateTaskDateRange } from '@shared/task/validation'
import { useI18n } from '@renderer/i18n/useI18n'
import { scrollGanttChartToDateCentered, scrollGanttChartToTask } from './ganttScroll'
import { evaluateTaskSchedule, scheduleHealthHintKey } from '@renderer/features/task/scheduleHealthUi'
import { PluginZoneHost } from '@renderer/plugin/PluginSlot'
import styles from './gantt.module.css'

const GANTT_ROW_HEIGHT = 44
const GANTT_HEADER_HEIGHT = 50
/** Approx. height of gantt-task-react bottom horizontal scrollbar */
const GANTT_H_SCROLL_HEIGHT = 20
/** Extra past columns so “today” can sit in the middle of the viewport */
const GANTT_PRE_STEPS = 8

export default function GanttView(): React.ReactElement {
  const { locale, t, formatError } = useI18n()
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
  const [zoom, setZoom] = useState(1)
  const [ganttBodyHeight, setGanttBodyHeight] = useState(360)
  const [viewDate] = useState(() => new Date())
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
  const suppressClickRef = useRef(false)
  const themeMode = useUiStore((s) => s.theme)
  const [todayColor, setTodayColor] = useState(() =>
    readCssVar('--lanpm-accent-fill', LANPM_ACCENT_FILL_RGBA.light)
  )
  const [ganttBarColors, setGanttBarColors] = useState(() => ({
    barBackgroundColor: readCssVar('--lanpm-accent', LANPM_ACCENT.light),
    barBackgroundSelectedColor: readCssVar('--lanpm-accent-hover', LANPM_ACCENT.lightHover),
    barProgressColor: readCssVar('--lanpm-accent-hover', LANPM_ACCENT.lightHover),
    barProgressSelectedColor: readCssVar('--lanpm-accent', LANPM_ACCENT.light)
  }))
  useEffect(() => {
    setTodayColor(readCssVar('--lanpm-accent-fill', LANPM_ACCENT_FILL_RGBA.light))
    setGanttBarColors({
      barBackgroundColor: readCssVar('--lanpm-accent', LANPM_ACCENT.light),
      barBackgroundSelectedColor: readCssVar('--lanpm-accent-hover', LANPM_ACCENT.lightHover),
      barProgressColor: readCssVar('--lanpm-accent-hover', LANPM_ACCENT.lightHover),
      barProgressSelectedColor: readCssVar('--lanpm-accent', LANPM_ACCENT.light)
    })
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

  const ganttReady = !loading && ganttTasks.length > 0
  const { highlightId } = useSearchHighlight('task', ganttReady)
  const tasksById = useMemo(() => new Map(tasks.map((t) => [t.taskId, t])), [tasks])

  useLayoutEffect(() => {
    if (!ganttReady || !chartRef.current) return
    const el = chartRef.current
    const measure = (): void => {
      const next = Math.max(
        120,
        el.clientHeight - GANTT_HEADER_HEIGHT - GANTT_H_SCROLL_HEIGHT
      )
      setGanttBodyHeight((prev) => (Math.abs(prev - next) < 2 ? prev : next))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ganttReady])

  useEffect(() => {
    if (!highlightId || !chartRef.current) return
    scrollGanttChartToTask(
      chartRef.current,
      highlightId,
      GANTT_ROW_HEIGHT,
      ganttTasks.map((b) => b.id)
    )
  }, [highlightId, ganttTasks])

  const columnWidth = useMemo(
    () => Math.round(ganttColumnWidthForView(viewMode) * zoom),
    [viewMode, zoom]
  )

  const timelineDates = useMemo(
    () => computeGanttTimelineDates(ganttTasks, viewMode, GANTT_PRE_STEPS),
    [ganttTasks, viewMode]
  )

  useLayoutEffect(() => {
    const el = chartRef.current
    if (!el || ganttTasks.length === 0) return
    patchGanttCalendarLabels(el, timelineDates, viewMode, columnWidth, locale)
  }, [ganttTasks, timelineDates, viewMode, columnWidth, locale])

  /** Open / zoom / mode / height settle → center timeline on today (not on every task tick) */
  useLayoutEffect(() => {
    if (!ganttReady || !chartRef.current || timelineDates.length === 0) return
    const el = chartRef.current
    const dates = timelineDates
    const id = window.requestAnimationFrame(() => {
      scrollGanttChartToDateCentered(el, columnWidth, dates, viewDate)
    })
    return () => window.cancelAnimationFrame(id)
    // timelineDates omitted on purpose — avoid fighting user scroll on task refresh
    // eslint-disable-next-line react-hooks/exhaustive-deps -- center only on viewport/scale changes
  }, [ganttReady, viewMode, columnWidth, ganttBodyHeight, viewDate])

  const taskOptions = useMemo(
    () => tasks.map((t) => ({ label: t.title, value: t.taskId })),
    [tasks]
  )

  const onDateChange = useCallback(
    async (bar: GanttTask): Promise<boolean> => {
      const task = tasks.find((item) => item.taskId === bar.id)
      if (!task) return false

      suppressClickRef.current = true
      const { startDate, endDate } = ganttDatesToYmd(bar.start, bar.end, task.milestone)
      if (!task.milestone && endDate < startDate) return false

      try {
        await updateSchedule({ taskId: task.taskId, startDate, endDate })
        return true
      } catch (err: unknown) {
        message.error(formatError(err, 'gantt.scheduleFailed'))
        return false
      } finally {
        window.setTimeout(() => {
          suppressClickRef.current = false
        }, 200)
      }
    },
    [tasks, updateSchedule, message, t]
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
      message.error(formatError(err, 'gantt.dependencyFailed'))
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
      message.error(formatError(err, 'gantt.milestoneFailed'))
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
    const dateErr = validateTaskDateRange(scheduleStart, scheduleEnd)
    if (dateErr) {
      message.warning(t(dateErr))
      return
    }
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
      message.error(formatError(err, 'gantt.scheduleFailed'))
    } finally {
      setScheduleSaving(false)
    }
  }

  const exportChart = async (format: 'png' | 'pdf'): Promise<void> => {
    const el = chartRef.current
    if (!el) return
    setExporting(true)
    try {
      patchGanttCalendarLabels(el, timelineDates, viewMode, columnWidth, locale)
      const stamp = new Date().toISOString().slice(0, 10)
      const base = `gantt-${gid || 'group'}-${stamp}`
      await exportGanttChart(el, `${base}.${format}`, format, {
        taskCount: ganttTasks.length,
        rowHeight: GANTT_ROW_HEIGHT,
        headerHeight: GANTT_HEADER_HEIGHT
      })
      message.success(format === 'png' ? t('gantt.exportPngDone') : t('gantt.exportPdfDone'))
    } catch {
      message.error(t('gantt.exportFailed'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className={styles.root}>
      <ViewToolbar
        start={
          <ViewToolbarPair>
            <ViewSegment
              value={viewMode}
              options={viewOptions}
              onChange={(v) => setViewMode(v as ViewMode)}
              ariaLabel={t('gantt.viewModeAria')}
            />
            <Button
              size="small"
              icon={<ZoomOutOutlined />}
              aria-label={t('gantt.zoomOut')}
              disabled={zoom <= GANTT_ZOOM_LEVELS[0]!}
              onClick={() => setZoom((z) => nextGanttZoomOut(z))}
            />
            <Button
              size="small"
              icon={<ZoomInOutlined />}
              aria-label={t('gantt.zoomIn')}
              disabled={zoom >= GANTT_ZOOM_LEVELS[GANTT_ZOOM_LEVELS.length - 1]!}
              onClick={() => setZoom((z) => nextGanttZoomIn(z))}
            />
          </ViewToolbarPair>
        }
        end={
          <ViewToolbarGroup>
            <ViewCrossLink onClick={() => navigate(groupViewPath(gid, 'board'))}>
              {t('gantt.boardViewLink')}
            </ViewCrossLink>
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

      <PluginZoneHost zone="toolbar" context={{ groupId: gid, view: 'gantt' }} />

      {loading && tasks.length === 0 ? (
        <ViewLoadingCenter />
      ) : ganttTasks.length === 0 ? (
        <ViewEmptyHint>{t('gantt.empty')}</ViewEmptyHint>
      ) : (
        <IslandPanel
          hideHeader
          aria-label={t('nav.gantt')}
          className={`${styles.chartIsland} ${highlightId ? styles.chartHighlight : ''}`}
          bodyClassName={styles.chartWrap}
          data-testid="gantt-island-surface"
        >
          <div ref={chartRef} className={styles.chartInner} data-lanpm-visual="gantt-chart">
            <Gantt
            key={locale}
            tasks={ganttTasks}
            viewMode={viewMode}
            locale={locale}
            viewDate={viewDate}
            preStepsCount={GANTT_PRE_STEPS}
            ganttHeight={ganttBodyHeight}
            headerHeight={GANTT_HEADER_HEIGHT}
            onDateChange={onDateChange}
            handleWidth={GANTT_HANDLE_WIDTH}
            timeStep={ganttTimeStepForView(viewMode)}
            onClick={(bar) => {
              if (suppressClickRef.current) return
              const task = tasks.find((item) => item.taskId === bar.id)
              if (task) openScheduleModal(task)
            }}
            onDoubleClick={(bar) => {
              const task = tasks.find((t) => t.taskId === bar.id)
              if (task) void toggleMilestone(task)
            }}
            listCellWidth=""
            columnWidth={columnWidth}
            rowHeight={GANTT_ROW_HEIGHT}
            barFill={56}
            todayColor={todayColor}
            barBackgroundColor={ganttBarColors.barBackgroundColor}
            barBackgroundSelectedColor={ganttBarColors.barBackgroundSelectedColor}
            barProgressColor={ganttBarColors.barProgressColor}
            barProgressSelectedColor={ganttBarColors.barProgressSelectedColor}
            TooltipContent={({ task: bar }) => {
              const task = tasks.find((t) => t.taskId === bar.id)
              if (!task) {
                return (
                  <div className={styles.tooltip}>
                    <div>{bar.name}</div>
                  </div>
                )
              }
              const preds = listTaskPredecessors(task, tasksById)
              const succs = listTaskSuccessors(task.taskId, tasks)
              const { health: scheduleHealth, expectedPercent } = evaluateTaskSchedule(task)
              const scheduleHintKey = scheduleHealthHintKey(scheduleHealth)
              return (
                <div className={styles.tooltip}>
                  <div>{bar.name}</div>
                  {scheduleHintKey && expectedPercent != null && (
                    <div className={styles.tooltipSchedule}>
                      {t('gantt.scheduleHealthLine', {
                        hint: t(scheduleHintKey),
                        expected: expectedPercent,
                        current: task.progressPercent
                      })}
                    </div>
                  )}
                  {preds.length > 0 && (
                    <div className={styles.tooltipDeps}>
                      <div>{t('task.predecessors')}</div>
                      {preds.map((d) => (
                        <Tag key={`${d.taskId}-${d.type}`} bordered={false}>
                          {d.type} · {d.title}
                        </Tag>
                      ))}
                    </div>
                  )}
                  {succs.length > 0 && (
                    <div className={styles.tooltipDeps}>
                      <div>{t('task.successors')}</div>
                      {succs.map((d) => (
                        <Tag key={`${d.taskId}-${d.type}`} bordered={false}>
                          {d.type} · {d.title}
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
        </IslandPanel>
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
            <RegionButton
              variant="toolbar"
              onClick={() => {
                if (!scheduleTask) return
                setScheduleOpen(false)
                navigate(groupViewPath(gid, 'board'), {
                  state: { highlightTaskId: scheduleTask.taskId }
                })
              }}
            >
              {t('gantt.openInBoard')}
            </RegionButton>
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
                onPressEnter={() => void saveSchedule()}
                style={{ width: '100%', marginTop: 4 }}
              />
            </div>
          </Space>
        )}
      </Modal>
    </div>
  )
}
