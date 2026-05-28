import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Modal, Radio, Select, Space, Spin, Tag, Typography, message } from 'antd'
import { DownloadOutlined, FilePdfOutlined, PlusOutlined } from '@ant-design/icons'
import { Gantt, ViewMode, type Task as GanttTask } from 'gantt-task-react'
import 'gantt-task-react/dist/index.css'
import { useParams } from 'react-router-dom'
import type { TaskDependencyType } from '@shared/task/dependency'
import { tasksToGanttBars, ganttDatesToYmd } from '@shared/task/ganttAdapter'
import type { Task } from '@shared/task/types'
import { useTaskStore } from '@renderer/stores/taskStore'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { exportElementToPdf, exportElementToPng } from './ganttExport'
import styles from './gantt.module.css'

const { Text } = Typography

const VIEW_OPTIONS = [
  { label: '日', value: ViewMode.Day },
  { label: '周', value: ViewMode.Week },
  { label: '月', value: ViewMode.Month }
] as const

const DEP_TYPES: { value: TaskDependencyType; label: string }[] = [
  { value: 'FS', label: 'FS 完成-开始' },
  { value: 'SS', label: 'SS 开始-开始' },
  { value: 'FF', label: 'FF 完成-完成' },
  { value: 'SF', label: 'SF 开始-完成' }
]

export default function GanttView(): React.ReactElement {
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
  const chartRef = useRef<HTMLDivElement>(null)

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
        message.error(err instanceof Error ? err.message : '更新排期失败')
      })
    },
    [tasks, updateSchedule]
  )

  const addDependency = async (): Promise<void> => {
    if (!gid || !fromId || !toId) {
      message.warning('请选择前置与后续任务')
      return
    }
    try {
      await upsertDependency({
        groupId: gid,
        fromTaskId: fromId,
        toTaskId: toId,
        type: depType
      })
      message.success('依赖已保存')
      setDepOpen(false)
      setFromId(undefined)
      setToId(undefined)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '保存依赖失败')
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
      message.error(err instanceof Error ? err.message : '更新里程碑失败')
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
      message.success(format === 'png' ? 'PNG 已导出' : 'PDF 已导出')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '导出失败')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <Radio.Group
          optionType="button"
          value={viewMode}
          options={VIEW_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
          onChange={(e) => setViewMode(e.target.value as ViewMode)}
        />
        <Space wrap>
          <Button icon={<PlusOutlined />} onClick={() => setDepOpen(true)}>
            添加依赖
          </Button>
          <Button
            icon={<DownloadOutlined />}
            loading={exporting}
            disabled={ganttTasks.length === 0}
            onClick={() => void exportChart('png')}
          >
            导出 PNG
          </Button>
          <Button
            icon={<FilePdfOutlined />}
            loading={exporting}
            disabled={ganttTasks.length === 0}
            onClick={() => void exportChart('pdf')}
          >
            导出 PDF
          </Button>
          <Text type="secondary" className={styles.hint}>
            拖拽任务条调整起止时间 · 非 FS 依赖存储后在列表展示
          </Text>
        </Space>
      </div>

      {loading && tasks.length === 0 ? (
        <Spin className={styles.spinner} />
      ) : ganttTasks.length === 0 ? (
        <Text type="secondary" className={styles.empty}>
          暂无任务，请先在「看板」创建任务并设置时间
        </Text>
      ) : (
        <div className={styles.chartWrap} ref={chartRef}>
          <Gantt
            tasks={ganttTasks}
            viewMode={viewMode}
            onDateChange={onDateChange}
            onDoubleClick={(bar) => {
              const task = tasks.find((t) => t.taskId === bar.id)
              if (task) void toggleMilestone(task)
            }}
            listCellWidth=""
            columnWidth={viewMode === ViewMode.Month ? 300 : viewMode === ViewMode.Week ? 200 : 60}
            rowHeight={44}
            barFill={56}
            todayColor="rgba(22, 119, 255, 0.08)"
            TooltipContent={({ task: bar }) => {
              const task = tasks.find((t) => t.taskId === bar.id)
              const deps = task?.dependencies ?? []
              return (
                <div className={styles.tooltip}>
                  <div>{bar.name}</div>
                  {deps.length > 0 && (
                    <div>
                      依赖：
                      {deps.map((d) => (
                        <Tag key={`${d.fromTaskId}-${d.type}`} style={{ marginTop: 4 }}>
                          {d.type}: {d.fromTaskId.slice(-6)} → {d.toTaskId.slice(-6)}
                        </Tag>
                      ))}
                    </div>
                  )}
                  <div className={styles.tooltipHint}>双击切换里程碑</div>
                </div>
              )
            }}
          />
        </div>
      )}

      <Modal
        title="添加任务依赖"
        open={depOpen}
        onCancel={() => setDepOpen(false)}
        onOk={() => void addDependency()}
        destroyOnHidden
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text type="secondary">前置任务</Text>
            <Select
              style={{ width: '100%', marginTop: 4 }}
              placeholder="选择前置"
              options={taskOptions}
              value={fromId}
              onChange={setFromId}
            />
          </div>
          <div>
            <Text type="secondary">后续任务</Text>
            <Select
              style={{ width: '100%', marginTop: 4 }}
              placeholder="选择后续"
              options={taskOptions}
              value={toId}
              onChange={setToId}
            />
          </div>
          <div>
            <Text type="secondary">依赖类型</Text>
            <Select
              style={{ width: '100%', marginTop: 4 }}
              options={DEP_TYPES}
              value={depType}
              onChange={setDepType}
            />
          </div>
        </Space>
      </Modal>
    </div>
  )
}
