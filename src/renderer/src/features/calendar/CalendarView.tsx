import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import zhCnLocale from '@fullcalendar/core/locales/zh-cn'
import type { EventClickArg, EventDropArg } from '@fullcalendar/core'
import type { EventResizeDoneArg } from '@fullcalendar/interaction'
import { useParams } from 'react-router-dom'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import { useI18n } from '@renderer/i18n/useI18n'
import {
  scheduleFromCalendarExclusiveRange,
  tasksToCalendarEvents
} from '@shared/task/calendarEvents'
import type { Task, TaskPriority, TaskStatus } from '@shared/task/types'
import { useTaskStore } from '@renderer/stores/taskStore'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import TaskEditModal from '@renderer/features/board/TaskEditModal'
import { ViewEmptyHint, ViewLoadingCenter } from '@renderer/ui/ViewState'
import ViewHelpButton from '@renderer/ui/ViewHelpButton'
import IslandPanel from '@renderer/ui/IslandPanel'
import styles from './calendar.module.css'

function ymdFromFcStr(value: string | null | undefined): string | null {
  if (!value) return null
  const ymd = value.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? ymd : null
}

export default function CalendarView(): React.ReactElement {
  const { locale, t, formatError } = useI18n()
  const { message } = useLanpmApp()
  const { groupId } = useParams<{ groupId: string }>()
  const gid = groupId ?? ''
  const tasks = useTaskStore((s) => s.tasksByGroup[gid] ?? [])
  const loading = useTaskStore((s) => s.loading[gid])
  const loadTasks = useTaskStore((s) => s.loadTasks)
  const updateTask = useTaskStore((s) => s.updateTask)
  const updateSchedule = useTaskStore((s) => s.updateSchedule)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const suppressClickRef = useRef(false)

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
      if (suppressClickRef.current) return
      const taskId = (arg.event.extendedProps as { taskId?: string }).taskId ?? arg.event.id
      const found = tasks.find((x) => x.taskId === taskId)
      if (found) setEditTask(found)
    },
    [tasks]
  )

  const applyCalendarSchedule = useCallback(
    async (arg: EventDropArg | EventResizeDoneArg): Promise<void> => {
      const taskId =
        (arg.event.extendedProps as { taskId?: string }).taskId ?? arg.event.id
      const startYmd = ymdFromFcStr(arg.event.startStr)
      const endExclusive = ymdFromFcStr(arg.event.endStr)
      const mapped =
        startYmd == null
          ? null
          : scheduleFromCalendarExclusiveRange(startYmd, endExclusive)
      if (!mapped) {
        arg.revert()
        message.error(t('calendar.scheduleInvalid'))
        return
      }
      suppressClickRef.current = true
      try {
        await updateSchedule({
          taskId,
          startDate: mapped.startDate,
          endDate: mapped.endDate
        })
        message.success(t('calendar.scheduleSaved'))
      } catch (err) {
        arg.revert()
        message.error(formatError(err, 'calendar.scheduleFailed'))
        void loadTasks(gid)
      } finally {
        window.setTimeout(() => {
          suppressClickRef.current = false
        }, 200)
      }
    },
    [updateSchedule, message, t, formatError, loadTasks, gid]
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
    <div className={styles.root}>
      {activeTasks.length === 0 ? <ViewEmptyHint>{t('calendar.empty')}</ViewEmptyHint> : null}

      <IslandPanel
        hideHeader
        aria-label={t('nav.calendar')}
        className={styles.calendarIsland}
        bodyClassName={styles.calendarHost}
        data-testid="calendar-island-surface"
        data-empty={activeTasks.length === 0 ? '1' : '0'}
      >
        <ViewHelpButton
          className={styles.helpBtn}
          content={t('calendar.toolbarHint')}
        />
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek'
          }}
          locale={locale === 'zh-CN' ? zhCnLocale : undefined}
          height="100%"
          events={events}
          editable
          eventStartEditable
          eventDurationEditable
          eventClick={handleEventClick}
          eventDrop={(arg) => void applyCalendarSchedule(arg)}
          eventResize={(arg) => void applyCalendarSchedule(arg)}
          dayMaxEvents={3}
          moreLinkClick="popover"
        />
      </IslandPanel>

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
