import { useCallback, useEffect, useMemo, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import zhCnLocale from '@fullcalendar/core/locales/zh-cn'
import type { EventClickArg } from '@fullcalendar/core'
import { useParams } from 'react-router-dom'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import { useI18n } from '@renderer/i18n/useI18n'
import { tasksToCalendarEvents } from '@shared/task/calendarEvents'
import type { Task, TaskPriority, TaskStatus } from '@shared/task/types'
import { useTaskStore } from '@renderer/stores/taskStore'
import { useUiStore } from '@renderer/stores/uiStore'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import TaskEditModal from '@renderer/features/board/TaskEditModal'
import { ViewEmptyHint, ViewLoadingCenter } from '@renderer/ui/ViewState'
import ViewToolbar, { ViewToolbarHint } from '@renderer/ui/ViewToolbar'
import styles from './calendar.module.css'

export default function CalendarView(): React.ReactElement {
  const { locale, t, formatError } = useI18n()
  const { message } = useLanpmApp()
  const { groupId } = useParams<{ groupId: string }>()
  const gid = groupId ?? ''
  const tasks = useTaskStore((s) => s.tasksByGroup[gid] ?? [])
  const loading = useTaskStore((s) => s.loading[gid])
  const loadTasks = useTaskStore((s) => s.loadTasks)
  const updateTask = useTaskStore((s) => s.updateTask)
  const theme = useUiStore((s) => s.theme)
  const [editTask, setEditTask] = useState<Task | null>(null)

  useEffect(() => {
    if (!gid) return
    void loadTasks(gid)
    return getLanpmApi().task.onTasksChanged((g) => {
      if (g === gid) void loadTasks(gid)
    })
  }, [gid, loadTasks])

  const events = useMemo(() => tasksToCalendarEvents(tasks), [tasks])
  const activeTasks = useMemo(() => tasks.filter((t) => !t.deletedAt), [tasks])
  const editTaskLive = useMemo(
    () => (editTask ? (tasks.find((x) => x.taskId === editTask.taskId) ?? editTask) : null),
    [editTask, tasks]
  )

  const handleEventClick = useCallback(
    (arg: EventClickArg) => {
      const taskId = (arg.event.extendedProps as { taskId?: string }).taskId ?? arg.event.id
      const found = tasks.find((x) => x.taskId === taskId)
      if (found) setEditTask(found)
    },
    [tasks]
  )

  const handleEditSave = useCallback(
    async (input: {
      taskId: string
      title: string
      description: string
      status: TaskStatus
      otherReason: string | null
      priority: TaskPriority
      assigneeUserId: string | null
      tags: string[]
      startDate: string | null
      endDate: string | null
      progressPercent: number
      milestone: boolean
    }) => {
      try {
        await updateTask({
          taskId: input.taskId,
          title: input.title,
          description: input.description || undefined,
          status: input.status,
          otherReason: input.otherReason,
          priority: input.priority,
          assigneeUserId: input.assigneeUserId,
          tags: input.tags,
          startDate: input.startDate,
          endDate: input.endDate,
          progressPercent: input.progressPercent,
          milestone: input.milestone
        })
        message.success(t('tree.detailSaved'))
        setEditTask(null)
      } catch (err) {
        message.error(formatError(err, 'tree.updateFailed'))
        throw err
      }
    },
    [updateTask, message, t, formatError]
  )

  if (loading && tasks.length === 0) {
    return <ViewLoadingCenter />
  }

  return (
    <div className={`${styles.root} ${theme === 'dark' ? styles.dark : styles.light}`}>
      <ViewToolbar>
        <ViewToolbarHint>{t('calendar.toolbarHint')}</ViewToolbarHint>
      </ViewToolbar>

      {activeTasks.length === 0 ? <ViewEmptyHint>{t('calendar.empty')}</ViewEmptyHint> : null}

      <div className={styles.calendarHost} data-empty={activeTasks.length === 0 ? '1' : '0'}>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek'
          }}
          locale={locale === 'zh-CN' ? zhCnLocale : undefined}
          height="100%"
          events={events}
          editable={false}
          eventStartEditable={false}
          eventDurationEditable={false}
          eventClick={handleEventClick}
          dayMaxEvents
        />
      </div>

      <TaskEditModal
        open={!!editTask}
        groupId={gid}
        task={editTaskLive}
        onCancel={() => setEditTask(null)}
        onSave={handleEditSave}
      />
    </div>
  )
}
